'use strict'

const Protocol = require('./protocol')
const util = require('ethereumjs-util')
const Block = require('ethereumjs-block')
const BN = util.BN

/**
 * Protocol message
 * @typedef {Object} Protocol~Message
 * @property {string} name message name
 * @property {number} code message code
 * @property {response} response code of response message
 * @property {function(...*): *} encode encode message arguments
 * @property {function(*): *} decode decodes message payload
 */

const messages = [{
  name: 'GetBlockHeaders',
  code: 0x03,
  response: 0x04,
  encode: (block, max, skip, reverse) => [
    BN.isBN(block) ? block.toBuffer() : block, max, skip, reverse
  ],
  decode: (payload) => payload
}, {
  name: 'BlockHeaders',
  code: 0x04,
  encode: (hashes) => hashes,
  decode: (payload) => payload.map(p => new Block.Header(p))
}]

/**
 * Implements eth/62 and eth/63 protocols
 * @memberof module:net/protocol
 */
class EthProtocol extends Protocol {
  /**
   * Create eth protocol
   * @param {Object}   options constructor parameters
   * @param {Chain}    options.chain blockchain
   * @param {number}   [options.timeout=5000] handshake timeout in ms
   * @param {Logger}   [options.logger] logger instance
   */
  constructor (options) {
    super(options)

    this.chain = options.chain
  }

  /**
   * Name of protocol
   * @type {string}
   */
  get name () {
    return 'eth'
  }

  /**
   * Protocol versions supported
   * @type {number[]}
   */
  get versions () {
    return [62, 63]
  }

  /**
   * Messages defined by this protocol
   * @type {Protocol~Message[]}
   */
  get messages () {
    return messages
  }

  /**
   * Opens protocol and any associated dependencies
   * @return {Promise}
   */
  async open () {
    if (this.opened) {
      return false
    }
    await this.chain.open()
    this.opened = true
  }

  /**
   * Encodes status into ETH status message payload
   * @return {Object}
   */
  encodeStatus () {
    return {
      networkId: this.chain.networkId,
      td: this.chain.td.toBuffer(),
      bestHash: this.chain.latest.hash(),
      genesisHash: this.chain.genesis.hash
    }
  }

  /**
   * Decodes ETH status message payload into a status object
   * @param {Object} status status message payload
   * @return {Object}
   */
  decodeStatus (status) {
    return {
      networkId: util.bufferToInt(status.networkId),
      td: new BN(status.td),
      bestHash: status.bestHash,
      genesisHash: status.genesisHash
    }
  }
}

module.exports = EthProtocol
