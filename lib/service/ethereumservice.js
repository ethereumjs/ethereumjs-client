'use strict'

const Service = require('./service')
const FlowControl = require('../net/protocol/flowcontrol')
const { Chain } = require('../blockchain')
const Common = require('ethereumjs-common').default

const defaultOptions = {
  lightserv: false,
  common: new Common('mainnet', 'chainstart'),
  minPeers: 3,
  timeout: 5000,
  interval: 1000
}

/**
 * Ethereum service
 * @memberof module:service
 */
class EthereumService extends Service {
  /**
   * Create new ETH service
   * @param {Object}   options constructor parameters
   * @param {Server[]} options.servers servers to run service on
   * @param {Chain}    [options.chain] blockchain
   * @param {LevelDB}  [options.db=null] blockchain database
   * @param {Common}   [options.common] ethereum network name
   * @param {number}   [options.minPeers=3] number of peers needed before syncing
   * @param {number}   [options.maxPeers=25] maximum peers allowed
   * @param {number}   [options.timeout] protocol timeout
   * @param {number}   [options.interval] sync retry interval
   * @param {Logger}   [options.logger] logger instance
   */
  constructor (options) {
    options = { ...defaultOptions, ...options }
    super(options)

    this.flow = new FlowControl(options)
    this.chain = options.chain || new Chain(options)
    this.common = options.common
    this.minPeers = options.minPeers
    this.interval = options.interval
    this.timeout = options.timeout
    this.synchronizer = null
  }

  /**
   * Service name
   * @protected
   * @type {string}
   */
  get name () {
    return 'eth'
  }

  /**
   * Open eth service. Must be called before service is started
   * @return {Promise}
   */
  async open () {
    if (this.opened) {
      return false
    }
    super.open()
    this.synchronizer.on('synchronized', () => this.emit('synchronized'))
    this.synchronizer.on('error', error => this.emit('error', error))
    await this.chain.open()
    await this.synchronizer.open()
  }

  /**
   * Starts service and ensures blockchain is synchronized. Returns a promise
   * that resolves once the service is started and blockchain is in sync.
   * @return {Promise}
   */
  async start () {
    if (this.running) {
      return false
    }
    await super.start()
    this.synchronizer.start()
  }

  /**
   * Stop service. Interrupts blockchain synchronization if its in progress.
   * @return {Promise}
   */
  async stop () {
    if (!this.running) {
      return false
    }
    await this.synchronizer.stop()
    await super.stop()
  }
}

module.exports = EthereumService
