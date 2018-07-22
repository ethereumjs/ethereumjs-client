const modules = require('./modules')

/**
 * @module rpc
 */

/**
 * get all methods. e.g., getBlockByNumber in eth module
 * @private
 * @param  {Object}   mod
 * @return {string[]}
 */
function getMethodNames (mod) {
  return Object.getOwnPropertyNames(mod.prototype)
}

/**
 * RPC server manager
 * @memberof module:rpc
 */
class RPCManager {
  constructor (chain, config) {
    this._config = config
    this._chain = chain
    this._logger = config.logger
  }

  /**
   * gets methods for all modules which concat with underscore "_"
   * e.g. convert getBlockByNumber() in eth module to { eth_getBlockByNumber }
   * @return {Object} methods
   */
  getMethods () {
    const methods = {}

    modules.list.forEach(modName => {
      this._logger.debug(`Initialize ${modName} module`)
      const mod = new modules[modName](this._chain)

      getMethodNames(modules[modName])
        .filter(methodName => methodName !== 'constructor')
        .forEach(methodName => {
          const concatedMethodName = `${modName}_${methodName}`

          this._logger.debug(`Setup module method '${concatedMethodName}' to RPC`)
          methods[concatedMethodName] = mod[methodName].bind(mod)
        })
    })

    return methods
  }
}

module.exports = RPCManager
