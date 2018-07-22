const jayson = require('jayson')
const Manager = require('../../lib/rpc')
const Logger = require('../../lib/logging')
const sinon = require('sinon')
module.exports = {
  startRPC (methods, port = 3000) {
    const server = jayson.server(methods)
    const httpServer = server.http()
    httpServer.listen(port)
    return httpServer
  },

  closeRPC (server) {
    server.close()
  },

  createManager (blockchain) {
    const config = { loglevel: 'error' }
    config.logger = Logger.getLogger(config)
    return new Manager(blockchain, config)
  },

  createBlockchain () {
    const transactions = [{
      hash: '0xc6ef2fc5426d6ad6fd9e2a26abeab0aa2411b7ab17f30a99d3cb96aed1d1055b'
    }]
    const block = {
      toJSON: sinon.stub().returns({ number: 1, transactions })
    }
    return {
      getBlock: sinon.stub().yields(null, block)
    }
  }
}
