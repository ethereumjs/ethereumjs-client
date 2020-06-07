'use strict'

const util = require('ethereumjs-util')
const { middleware } = require('../validation')
const getClientVersion = require('../../util/getClientVersion')

/**
 * admin_* RPC module
 * @memberof module:rpc/modules
 */
class Admin {
  /**
   * Create net_* RPC module
   * @param {Node} Node to which the module binds
   */
  constructor (node) {
    const service = node.services.find(s => s.name === 'eth')
    this._chain = service.chain
    this._node = node
    this._ethProtocol = service.protocols.find(p => p.name === 'eth')

    this.getNodeInfo = middleware(this.getNodeInfo.bind(this), 0, [])
  }

  /**
   * Returns information about the currently running node.
   * @param {*} [params] An empty array
   * @param {*} [cb] A function with an error object as the first argument and the
   */
  async getNodeInfo (params, cb) {
    const rlpxInfo = this._node.servers.find(s => s.name === 'rlpx').getRlpxInfo()
    const name = getClientVersion()
    const ethVersion = Math.max.apply(Math, this._ethProtocol.versions)
    const network = this._chain.networkId
    const lastetHeader = this._chain._headers.latest
    const headHash = util.bufferToHex(lastetHeader.mixHash)
    const difficutly = lastetHeader.difficulty
    const genesisHash = util.bufferToHex(this._chain.genesis.hash)
    const nodeInfo = {
      ...rlpxInfo,
      name,
      protocols: {
        eth: {
          version: `eth/${ethVersion}`,
          difficutly,
          genesis: genesisHash,
          head: headHash,
          network,
        }
      }
    }
    return cb(null, nodeInfo)
  }
}

module.exports = Admin
