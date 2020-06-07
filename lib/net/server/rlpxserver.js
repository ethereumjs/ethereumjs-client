'use strict'

const Server = require('./server')
const { randomBytes } = require('crypto')
const devp2p = require('ethereumjs-devp2p')
const RlpxPeer = require('../peer/rlpxpeer')
const { parse } = require('../../util')

const defaultOptions = {
  port: 30303,
  key: randomBytes(32),
  clientFilter: ['go1.5', 'go1.6', 'go1.7', 'quorum', 'pirl', 'ubiq', 'gmc', 'gwhale', 'prichain'],
  bootnodes: []
}

const ignoredErrors = new RegExp([
  'EPIPE',
  'ECONNRESET',
  'ETIMEDOUT',
  'NetworkId mismatch',
  'Timeout error: ping',
  'Genesis block mismatch',
  'Handshake timed out',
  'Invalid address buffer',
  'Invalid MAC',
  'Invalid timestamp buffer',
  'Hash verification failed'
].join('|'))

/**
 * DevP2P/RLPx server
 * @emits connected
 * @emits disconnected
 * @emits error
 * @memberof module:net/server
 */
class RlpxServer extends Server {
  /**
   * Create new DevP2P/RLPx server
   * @param {Object}   options constructor parameters
   * @param {Object[]} [options.bootnodes] list of bootnodes to use for discovery (can be
   * a comma separated string or list)
   * @param {number}   [options.maxPeers=25] maximum peers allowed
   * @param {number}   [options.port=null] local port to listen on
   * @param {Buffer}   [options.key] private key to use for server
   * @param {string[]} [options.clientFilter] list of supported clients
   * @param {number}   [options.refreshInterval=30000] how often (in ms) to discover new peers
   * @param {Logger}   [options.logger] Logger instance
   */
  constructor (options) {
    super(options)
    options = { ...defaultOptions, ...options }

    // TODO: get the external ip from the upnp service
    this.ip = '::'
    this.port = options.port
    this.key = options.key
    this.clientFilter = options.clientFilter
    this.bootnodes = options.bootnodes
    this.init()
  }

  /**
   * Server name
   * @type {string}
   */
  get name () {
    return 'rlpx'
  }

  init () {
    this.dpt = null
    this.rlpx = null
    this.peers = new Map()
    if (typeof this.bootnodes === 'string') {
      this.bootnodes = parse.bootnodes(this.bootnodes)
    }
    if (typeof this.key === 'string') {
      this.key = Buffer.from(this.key, 'hex')
    }
  }

  /**
   * Start Devp2p/RLPx server. Returns a promise that resolves once server has been started.
   * @return {Promise}
   */
  async start () {
    if (this.started) {
      return false
    }

    await super.start()
    this.initDpt()
    this.initRlpx()

    this.bootnodes.map(node => {
      const bootnode = {
        address: node.ip,
        udpPort: node.port,
        tcpPort: node.port
      }
      return this.dpt.bootstrap(bootnode).catch(e => this.error(e))
    })

    this.started = true
  }

  /**
   * Stop Devp2p/RLPx server. Returns a promise that resolves once server has been stopped.
   * @return {Promise}
   */
  async stop () {
    if (!this.started) {
      return false
    }
    this.rlpx.destroy()
    this.dpt.destroy()
    await super.stop()
  }

  /**
   * Return Rlpx info
   */
  getRlpxInfo () {
    const id = this.rlpx._id.toString('hex')
    return {
      enode: `enode://${id}@[${this.ip}]:${this.port}`,
      id: id,
      ip: this.ip,
      listenAddr: `[${this.ip}]:${this.port}`,
      ports: { 'discovery': this.port, 'listener': this.port }
    }
  }

  /**
   * Ban peer for a specified time
   * @param  {string} peerId id of peer
   * @param  {number} [maxAge] how long to ban peer
   * @return {Promise}
   */
  ban (peerId, maxAge = 60000) {
    if (!this.started) {
      return false
    }
    this.dpt.banPeer(peerId, maxAge)
  }

  /**
   * Handles errors from server and peers
   * @private
   * @param  {Error} error
   * @param  {Peer} peer
   * @emits  error
   */
  error (error, peer) {
    if (ignoredErrors.test(error.message)) {
      return
    }
    if (peer) {
      peer.emit('error', error)
    } else {
      this.emit('error', error)
    }
  }

  /**
   * Initializes DPT for peer discovery
   * @private
   */
  initDpt () {
    this.dpt = new devp2p.DPT(this.key, {
      refreshInterval: this.refreshInterval,
      endpoint: {
        address: '0.0.0.0',
        udpPort: null,
        tcpPort: null
      }
    })

    this.dpt.on('error', e => this.error(e))

    if (this.port) {
      this.dpt.bind(this.port, '0.0.0.0')
    }
  }

  /**
   * Initializes RLPx instance for peer management
   * @private
   */
  initRlpx () {
    this.rlpx = new devp2p.RLPx(this.key, {
      dpt: this.dpt,
      maxPeers: this.maxPeers,
      capabilities: RlpxPeer.capabilities(this.protocols),
      remoteClientIdFilter: this.clientFilter,
      listenPort: this.port
    })

    this.rlpx.on('peer:added', async (rlpxPeer) => {
      const peer = new RlpxPeer({
        id: rlpxPeer.getId().toString('hex'),
        host: rlpxPeer._socket.remoteAddress,
        port: rlpxPeer._socket.remotePort,
        protocols: Array.from(this.protocols),
        inbound: !!rlpxPeer._socket.server
      })
      try {
        await peer.accept(rlpxPeer, this)
        this.peers.set(peer.id, peer)
        this.logger.debug(`Peer connected: ${peer}`)
        this.emit('connected', peer)
      } catch (error) {
        this.error(error)
      }
    })

    this.rlpx.on('peer:removed', (rlpxPeer, reason) => {
      const id = rlpxPeer.getId().toString('hex')
      const peer = this.peers.get(id)
      if (peer) {
        this.peers.delete(peer.id)
        this.logger.debug(`Peer disconnected (${rlpxPeer.getDisconnectPrefix(reason)}): ${peer}`)
        this.emit('disconnected', peer)
      }
    })

    this.rlpx.on('peer:error', (rlpxPeer, error) => {
      const peerId = rlpxPeer && rlpxPeer.getId()
      if (!peerId) {
        return this.error(error)
      }
      const id = peerId.toString('hex')
      const peer = this.peers.get(id)
      this.error(error, peer)
    })

    this.rlpx.on('error', e => this.error(e))

    this.rlpx.on('listening', () => {
      this.emit('listening', {
        transport: this.name,
        url: this.getRlpxInfo().enode
      })
    })

    if (this.port) {
      this.rlpx.listen(this.port, '0.0.0.0')
    }
  }
}

module.exports = RlpxServer
