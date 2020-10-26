import tape from 'tape-catch'
const td = require('testdouble')
const EventEmitter = require('events')
import Node from '../lib/node'
import { Server } from '../lib/net/server'
const { defaultLogger } = require('../lib/logging')
defaultLogger.silent = true

tape('[Node]', (t) => {
  class EthereumService extends EventEmitter {}
  EthereumService.prototype.open = td.func()
  EthereumService.prototype.start = td.func()
  EthereumService.prototype.stop = td.func()
  td.when(EthereumService.prototype.open()).thenResolve()
  td.when(EthereumService.prototype.start()).thenResolve()
  td.when(EthereumService.prototype.stop()).thenResolve()
  td.replace('../lib/service', { EthereumService })
  class MockServer extends EventEmitter {}
  MockServer.prototype.open = td.func()
  MockServer.prototype.start = td.func()
  MockServer.prototype.stop = td.func()
  td.when(MockServer.prototype.start()).thenResolve()
  td.when(MockServer.prototype.stop()).thenResolve()
  td.replace('../lib/net/server/server', MockServer)

  t.test('should initialize correctly', (t) => {
    const node = new Node()
    t.ok(node.services[0] instanceof EthereumService, 'added service')
    t.end()
  })

  t.test('should open', async (t) => {
    t.plan(6)
    const servers = [new MockServer() as Server]
    const node = new Node({ servers })
    node.on('error', (err: string) => {
      if (err === 'err0') t.pass('got err0')
      if (err === 'err1') t.pass('got err1')
    })
    node.on('listening', (details: string) => t.equals(details, 'details0', 'got listening'))
    node.on('synchronized', () => t.ok('got synchronized'))
    await node.open()
    servers[0].emit('error', 'err0')
    servers[0].emit('listening', 'details0')
    node.services[0].emit('error', 'err1')
    node.services[0].emit('synchronized')
    t.ok(node.opened, 'opened')
    t.equals(await node.open(), false, 'already opened')
  })

  t.test('should start/stop', async (t) => {
    const servers = [new MockServer() as Server]
    const node = new Node({ servers })
    await node.start()
    t.ok(node.started, 'started')
    t.equals(await node.start(), false, 'already started')
    await node.stop()
    t.notOk(node.started, 'stopped')
    t.equals(await node.stop(), false, 'already stopped')
    t.end()
  })

  t.test('should reset td', (t) => {
    td.reset()
    t.end()
  })
})
