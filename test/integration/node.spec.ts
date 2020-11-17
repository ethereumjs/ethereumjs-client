import tape from 'tape'
import { Config } from '../../lib/config'
import Node from '../../lib/node'
import MockServer from './mocks/mockserver'

tape('[Integration:Node]', (t) => {
  const servers = [new MockServer({ config: new Config({ loglevel: 'error' }) }) as any]
  const config = new Config({ servers, syncmode: 'full', lightserv: false, loglevel: 'error' })
  const node = new Node({ config })

  t.test('should start/stop', async (t) => {
    t.plan(4)
    node.on('error', (err: any) => t.equal(err, 'err0', 'got error'))
    node.on('listening', (details: any) => {
      t.deepEqual(details, { transport: 'mock', url: 'mock://127.0.0.1' }, 'server listening')
    })
    await node.open()
    ;(node.service('eth') as any).interval = 100
    node.service('eth')?.emit('error', 'err0')
    await node.start()
    t.ok((node.service('eth') as any).synchronizer.running, 'sync running')
    await node.stop()
    t.pass('node stopped')
  })
})
