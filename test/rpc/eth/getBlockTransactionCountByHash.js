const test = require('tape')

const { INVALID_PARAMS } = require('../../../lib/rpc/error-code')
const { baseSetup, params, baseRequest } = require('../helpers')
const { checkError } = require('../util')

const method = 'eth_getBlockTransactionCountByHash'

test(`${method}: call with valid arguments`, t => {
  const server = baseSetup()

  const req = params(method, [
    '0x910abca1728c53e8d6df870dd7af5352e974357dc58205dea1676be17ba6becf'
  ])
  const expectRes = res => {
    const msg = 'transaction count should be 1'
    if (res.body.result !== `0x1`) {
      throw new Error(msg)
    } else {
      t.pass(msg)
    }
  }
  baseRequest(t, server, req, 200, expectRes)
})

test(`${method}: call with invalid block hash without 0x`, t => {
  const server = baseSetup()

  const req = params(method, ['WRONG BLOCK NUMBER'])
  const expectRes = checkError(
    t,
    INVALID_PARAMS,
    'invalid argument 0: hex string without 0x prefix'
  )
  baseRequest(t, server, req, 200, expectRes)
})

test(`${method}: call with invalid hex string as block hash`, t => {
  const server = baseSetup()

  const req = params(method, ['0xWRONG BLOCK NUMBER', true])
  const expectRes = checkError(
    t,
    INVALID_PARAMS,
    'invalid argument 0: invalid block hash'
  )
  baseRequest(t, server, req, 200, expectRes)
})

test(`${method}: call without first parameter`, t => {
  const server = baseSetup()

  const req = params(method, [])
  const expectRes = checkError(
    t,
    INVALID_PARAMS,
    'missing value for required argument 0'
  )
  baseRequest(t, server, req, 200, expectRes)
})

test(`${method}: call with invalid second parameter`, t => {
  const server = baseSetup()

  const req = params(method, ['INVALID PARAMETER'])
  const expectRes = checkError(t, INVALID_PARAMS)
  baseRequest(t, server, req, 200, expectRes)
})
