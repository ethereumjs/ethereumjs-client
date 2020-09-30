const Protocol = require('./protocol')
const util = require('ethereumjs-util')
const Block = require('ethereumjs-block')
const BN = util.BN

const messages = [{
  name: 'NewBlockHashes',
  code: 0x01,
  encode: (hashes: any[]) => hashes.map(hn => [hn[0], hn[1].toArrayLike(Buffer)]),
  decode: (hashes: any[]) => hashes.map(hn => [hn[0], new BN(hn[1])])
}, {
  name: 'GetBlockHeaders',
  code: 0x03,
  response: 0x04,
  encode: ({ block, max, skip = 0, reverse = 0 }: any) => [
    BN.isBN(block) ? block.toArrayLike(Buffer) : block, max, skip, reverse
  ],
  decode: ([block, max, skip, reverse]: any) => ({
    block: block.length === 32 ? block : new BN(block),
    max: util.bufferToInt(max),
    skip: util.bufferToInt(skip),
    reverse: util.bufferToInt(reverse)
  })
}, {
  name: 'BlockHeaders',
  code: 0x04,
  encode: (headers: any[]) => headers.map(h => h.raw),
  decode: (headers: any[]) => headers.map(raw => new Block.Header(raw))
}, {
  name: 'GetBlockBodies',
  code: 0x05,
  response: 0x06
}, {
  name: 'BlockBodies',
  code: 0x06
}]

/**
 * Implements eth/62 and eth/63 protocols
 * @memberof module:net/protocol
 */
export = module.exports = class EthProtocol extends Protocol {
  /**
   * Create eth protocol
   * @param {Object}   options constructor parameters
   * @param {Chain}    options.chain blockchain
   * @param {number}   [options.timeout=8000] handshake timeout in ms
   * @param {Logger}   [options.logger] logger instance
   */
  constructor (options: any) {
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
    return [63, 62]
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
      td: this.chain.blocks.td.toArrayLike(Buffer),
      bestHash: this.chain.blocks.latest.hash(),
      genesisHash: this.chain.genesis.hash
    }
  }

  /**
   * Decodes ETH status message payload into a status object
   * @param {Object} status status message payload
   * @return {Object}
   */
  decodeStatus (status: any) {
    return {
      networkId: util.bufferToInt(status.networkId),
      td: new BN(status.td),
      bestHash: status.bestHash,
      genesisHash: status.genesisHash
    }
  }
}