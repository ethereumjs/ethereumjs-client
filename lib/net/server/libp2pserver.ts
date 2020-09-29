

const Server = require('./server')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const Libp2pNode = require('../peer/libp2pnode')
const Libp2pPeer = require('../peer/libp2ppeer')

const LIBP2PSERVER_DEFAULT_OPTIONS = {
  multiaddrs: [ '/ip4/127.0.0.1/tcp/50580/ws' ],
  key: null,
  bootnodes: []
}

/**
 * Libp2p server
 * @emits connected
 * @emits disconnected
 * @emits error
 * @memberof module:net/server
 */
class Libp2pServer extends Server {
  /**
   * Create new DevP2P/RLPx server
   * @param {Object}   options constructor parameters
   * @param {Object[]} [options.bootnodes] list of bootnodes to use for discovery (can be
   * a comma separated string or list)
   * @param {number}   [options.maxPeers=25] maximum peers allowed
   * @param {multiaddr[]}   [options.multiaddrs] multiaddrs to listen on (can be
   * a comma separated string or list)
   * @param {Buffer}   [options.key] private key to use for server
   * @param {number}   [options.refreshInterval=30000] how often (in ms) to discover new peers
   * @param {Logger}   [options.logger] Logger instance
   */
  constructor (options: any) {
    super(options)
    options = { ...LIBP2PSERVER_DEFAULT_OPTIONS, ...options }
    this.multiaddrs = options.multiaddrs
    this.key = options.key
    this.bootnodes = options.bootnodes
    this.node = null
    this.banned = new Map()
    this.peers = new Map()
    this.init()
  }

  /**
   * Server name
   * @type {string}
   */
  get name () {
    return 'libp2p'
  }

  init () {
    if (typeof this.key === 'string') {
      this.key = Buffer.from(this.key, 'base64')
    }
    if (typeof this.multiaddrs === 'string') {
      this.multiaddrs = this.multiaddrs.split(',')
    }
    if (typeof this.bootnodes === 'string') {
      this.bootnodes = this.bootnodes.split(',')
    }
  }

  /**
   * Start Libp2p server. Returns a promise that resolves once server has been started.
   * @return {Promise}
   */
  async start () {
    if (this.started) {
      return false
    }
    await super.start()
    if (!this.node) {
      this.node = new Libp2pNode({
        peerInfo: await this.createPeerInfo(),
        bootnodes: this.bootnodes
      })
      this.protocols.forEach(async (p: any) => {
        const protocol = `/${p.name}/${p.versions[0]}`
        this.node.handle(protocol, async (_: any, connection: any) => {
          try {
            const peerInfo = await this.getPeerInfo(connection)
            const id = (peerInfo as any).id.toB58String()
            const peer = this.peers.get(id)
            await peer.accept(p, connection, this)
            this.emit('connected', peer)
          } catch (e) {
            this.error(e)
          }
        })
      })
    }
    this.node.on('peer:discovery', async (peerInfo: any) => {
      try {
        const id = peerInfo.id.toB58String()
        if (this.peers.get(id) || this.isBanned(id)) {
          return
        }
        const peer = this.createPeer(peerInfo)
        await peer.bindProtocols(this.node, peerInfo, this)
        this.logger.debug(`Peer discovered: ${peer}`)
        this.emit('connected', peer)
      } catch (e) {
        this.error(e)
      }
    })
    this.node.on('peer:connect', (peerInfo: any) => {
      try {
        const peer = this.createPeer(peerInfo)
        this.logger.debug(`Peer connected: ${peer}`)
      } catch (e) {
        this.error(e)
      }
    })
    await new Promise((resolve, reject) => this.node.start((err: any) => {
      if (err) reject(err)
      resolve()
    }))
    this.node.peerInfo.multiaddrs.toArray().map((ma: any) => {
      this.emit('listening', {
        transport: this.name,
        url: ma.toString()
      })
    })
    this.started = true
  }

  /**
   * Stop Libp2p server. Returns a promise that resolves once server has been stopped.
   * @return {Promise}
   */
  async stop () {
    if (!this.started) {
      return false
    }
    await new Promise((resolve, reject) => this.node.stop((err: any) => {
      if (err) reject(err)
      resolve()
    }))
    await super.stop()
  }

  /**
   * Ban peer for a specified time
   * @param  peerId id of peer
   * @param  [maxAge] how long to ban peer
   * @return {Promise}
   */
  ban (peerId: string, maxAge = 60000) {
    if (!this.started) {
      return false
    }
    this.banned.set(peerId, Date.now() + maxAge)
  }

  /**
   * Check if peer is currently banned
   * @param  peerId id of peer
   * @return true if banned
   */
  isBanned (peerId: string): boolean {
    const expireTime = this.banned.get(peerId)
    if (expireTime && expireTime > Date.now()) {
      return true
    }
    this.banned.delete(peerId)
    return false
  }

  /**
   * Handles errors from server and peers
   * @private
   * @param  error
   * @emits  error
   */
  error (error: Error) {
    this.emit('error', error)
  }

  async createPeerInfo () {
    return new Promise((resolve, reject) => {
      const handler = (err: any, peerInfo: any) => {
        if (err) {
          return reject(err)
        }
        this.multiaddrs.forEach((ma: any) => peerInfo.multiaddrs.add(ma))
        resolve(peerInfo)
      }
      if (this.key) {
        PeerId.createFromPrivKey(this.key, (err: any, id: any) => {
          if (err) {
            return reject(err)
          }
          PeerInfo.create(id, handler)
        })
      } else {
        PeerInfo.create(handler)
      }
    })
  }

  async getPeerInfo (connection: any) {
    return new Promise((resolve, reject) => {
      connection.getPeerInfo((err: any, info: any) => {
        if (err) { return reject(err) }
        resolve(info)
      })
    })
  }

  createPeer (peerInfo: any) {
    const peer = new Libp2pPeer({
      id: peerInfo.id.toB58String(),
      multiaddrs: peerInfo.multiaddrs.toArray().map((ma: any) => ma.toString()),
      protocols: Array.from(this.protocols)
    })
    this.peers.set(peer.id, peer)
    return peer
  }
}

module.exports = Libp2pServer