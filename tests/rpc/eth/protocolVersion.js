const test = require('tape')
const request = require('supertest')
const { startRPC, closeRPC, createManager, createBlockchain } = require('../helpers')
const c = require('../../../lib/constants')

test('call eth_protocolVersion with no arguments', t => {
  const manager = createManager(createBlockchain())
  const server = startRPC(manager.getMethods())

  const req = {
    jsonrpc: '2.0',
    method: 'eth_protocolVersion',
    params: [],
    id: 1
  }

  request(server)
    .post('/')
    .set('Content-Type', 'application/json')
    .send(req)
    .expect(200)
    .expect(res => {
      if (res.body.result !== c.CURRENT_ETHEREUM_PROTOCOL_VERSION) {
        throw new Error('wrong protocol version')
      }
    })
    .end((err, res) => {
      closeRPC(server)
      t.end(err)
    })
})
