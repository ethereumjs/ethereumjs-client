'use strict'

const EventEmitter = require('events')
const PeerPool = require('../net/peerpool')

const defaultOptions = {
  maxPeers: 25
}

class Service extends EventEmitter {
  constructor (options) {
    if (!options.server) throw new Error('Server is required');
    super()
    options = { ...defaultOptions, ...options }

    this.opened = false
    this.running = false
    this.server = options.server
    this.pool = new PeerPool({
      server: this.server,
      maxPeers: options.maxPeers
    })
    this.pool.on('message', async (message, protocol, peer) => {
      if (this.running) {
        try {
          await this.handle(message, protocol, peer)
        } catch (error) {
          console.log(`Error handling message (${protocol}:${message.name}): ${error.message}`)
        }
      }
    })
  }

  /**
   * Service name
   * @protected
   * @type {string}
   */
  get name () {
    throw new Error('Unimplemented')
  }

  /**
   * Returns all protocols required by this service
   * @type {Protocol[]} required protocols
   */
  get protocols () {
    return []
  }

  /**
   * Open service. Must be called before service is running
   * @return {Promise}
   */
  async open () {
    if (this.opened) {
      return false
    }
    const protocols = this.protocols
    this.server.addProtocols(protocols);
    if (this.pool) {
      this.pool.on('banned', peer => console.log(`Peer banned: ${peer}`))
      this.pool.on('error', error => this.emit('error', error))
      this.pool.on('added', peer => console.log(`Peer added: ${peer}`))
      this.pool.on('removed', peer => console.log(`Peer removed: ${peer}`))
      await this.pool.open()
    }
    this.opened = true
  }

  /**
   * Close service.
   * @return {Promise}
   */
  async close () {
    if (this.pool) {
      this.pool.removeAllListeners()
      await this.pool.close()
    }
    this.opened = false
  }

  /**
   * Start service
   * @return {Promise}
   */
  async start () {
    if (this.running) {
      return false
    }
    await this.server.start();
    this.running = true
    console.log(`Started ${this.name} service.`)
  }

  /**
   * Start service
   * @return {Promise}
   */
  async stop () {
    this.running = false
    console.log(`Stopped ${this.name} service.`);
  }

  /**
   * Handles incoming request from connected peer
   * @param  {Object}  message message object
   * @param  {string}  protocol protocol name
   * @param  {Peer}    peer peer
   * @return {Promise}
   */
  async handle (message, protocol, peer) {
  }
}

module.exports = Service
