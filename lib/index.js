const { randomBytes } = require('crypto')
const Common = require('ethereumjs-common')
const Logger = require('./logging.js')
const EthNetworkManager = require('./net/EthNetworkManager.js')
const ChainManager = require('./chain/ChainManager.js')
const path = require('path')


function runClient () {
  const cliParser = require('./cliParser.js')
  const config = cliParser.getClientConfig()
  config.logger = Logger.getLogger(config)
  config.common = new Common(config.networkid)
  config.datadir = path.normalize(config.datadir + '/') + `${config.common.chainName()}`

  const logger = config.logger
  logger.info('ethereumjs-client initialized')
  logger.info('Connecting to the %s network', config.common.chainName())

  const PRIVATE_KEY = randomBytes(32)
  var nm = new EthNetworkManager(PRIVATE_KEY, config)

  var cm = new ChainManager(config, nm) // eslint-disable-line
}

runClient()
