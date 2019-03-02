'use strict'

const EventEmitter = require('events')
const { FastEthereumService, LightEthereumService } = require('./service');
const RlpxServer = require('../lib/net/server/rlpxserver');

const defaultOptions = {
  minPeers: 3,
  maxPeers: 25,
  servers: []
}

/**
 * Represents the top-level ethereum node, and is responsible for managing the
 * lifecycle of included services.
 * @memberof module:node
 */
class Node extends EventEmitter {
  /**
   * Create new node
   * @param {Object}   options constructor parameters
   * @param {Common}   [options.common] common parameters
   * @param {LevelDB}  [options.db=null] blockchain database
   * @param {string}   [options.syncmode=light] synchronization mode ('fast' or 'light')
   * @param {boolean}  [options.lightserv=false] serve LES requests
   * @param {Object[]} [options.bootnodes] list of bootnodes to use for discovery
   * @param {number}   [options.minPeers=3] number of peers needed before syncing
   * @param {number}   [options.maxPeers=25] maximum peers allowed
   * @param {string[]} [options.clientFilter] list of supported clients
   * @param {number}   [options.refreshInterval] how often to discover new peers
   */
  constructor (options) {
    super();
    options = {...defaultOptions, ...options};

    this.common = options.common;
    this.syncmode = options.syncmode;

    this.server = new RlpxServer({ port: 30303 });
    this.service = new FastEthereumService({
      server: this.server,
      lightserv: options.lightserv,
      common: options.common,
      minPeers: options.minPeers,
      maxPeers: options.maxPeers,
      db: options.db
    });

    this.opened = false;
    this.started = false;
  }

  /**
   * Open node. Must be called before node is started
   * @return {Promise}
   */
  async open() {
    if (this.opened) {
      return false;
    }

    this.server
      .on('error', error => this.emit('error', error))
      .on('listening', details => this.emit('listening', details));

    this.service
      .on('error', error => this.emit('error', error))
      .on('synchronized', stats => this.emit('synchronized', stats));

    await this.service.open();
    this.opened = true;

    return true;
  }

  async start() {
    if (this.started) {
      return false;
    }
    await this.server.start();
    await this.service.start();

    this.started = true;
    return true;
  }

  async stop() {
    if (!this.started) {
      return false;
    }
    await this.service.stop();
    await this.service.stop();
    this.started = false;
    return true;
  }
}

module.exports = Node
