const test = require('tape')
const { INVALID_PARAMS } = require('../../../lib/rpc/error-code')
const { startRPC, createManager, createNode, params, baseRequest } = require('../helpers')
const { checkError } = require('../util')

function createBlockchain () {
  const transactions = [
    {
      hash: '0xc6ef2fc5426d6ad6fd9e2a26abeab0aa2411b7ab17f30a99d3cb96aed1d1055b'
    }
  ]
  const block = {
    toJSON: () => ({ number: 1, transactions })
  }
  return {
    getBlock: () => block
  }
}

const method = 'eth_getBlockByNumber'

test(`${method}: call with valid arguments`, t => {
  const manager = createManager(createNode({ blockchain: createBlockchain() }))
  const server = startRPC(manager.getMethods())

  const req = params(method, ['0x1', true])
  const expectRes = res => {
    const msg = 'should return the correct number'
    if (res.body.result.number !== 1) {
      throw new Error(msg)
    } else {
      t.pass(msg)
    }
  }
  baseRequest(t, server, req, 200, expectRes)
})

test(`${method}: call with false for second argument`, t => {
  const manager = createManager(createNode({ blockchain: createBlockchain() }))
  const server = startRPC(manager.getMethods())

  const req = params(method, ['0x1', false])
  const expectRes = res => {
    let msg = 'should return the correct number'
    if (res.body.result.number !== 1) {
      throw new Error(msg)
    } else {
      t.pass(msg)
    }
    msg = 'should return only the hashes of the transactions'
    if (typeof res.body.result.transactions[0] !== 'string') {
      throw new Error(msg)
    } else {
      t.pass(msg)
    }
  }
  baseRequest(t, server, req, 200, expectRes)
})

test(`${method}: call with invalid block number`, t => {
  const manager = createManager(createNode({ blockchain: createBlockchain() }))
  const server = startRPC(manager.getMethods())

  const req = params(method, ['WRONG BLOCK NUMBER', true])
  const expectRes = checkError(
    t,
    INVALID_PARAMS,
    'invalid argument 0: hex string without 0x prefix'
  )
  baseRequest(t, server, req, 200, expectRes)
})

test(`${method}: call without second parameter`, t => {
  const manager = createManager(createNode({ blockchain: createBlockchain() }))
  const server = startRPC(manager.getMethods())

  const req = params(method, ['0x0'])
  const expectRes = checkError(
    t,
    INVALID_PARAMS,
    'missing value for required argument 1'
  )
  baseRequest(t, server, req, 200, expectRes)
})

test(`${method}: call with invalid second parameter`, t => {
  const manager = createManager(createNode({ blockchain: createBlockchain() }))
  const server = startRPC(manager.getMethods())

  const req = params(method, ['0x0', 'INVALID PARAMETER'])
  const expectRes = checkError(t, INVALID_PARAMS)
  baseRequest(t, server, req, 200, expectRes)
})
