import tape from 'tape'
import { BN } from 'ethereumjs-util'
import { Config } from '../../lib/config'
import { FullEthereumService } from '../../lib/service'
import MockServer from './mocks/mockserver'
import MockChain from './mocks/mockchain'
import { destroy } from './util'

tape('[Integration:FullEthereumService]', async (t) => {
  async function setup(): Promise<[MockServer, FullEthereumService]> {
    const loglevel = 'error'
    const config = new Config({ loglevel })
    const server = new MockServer({ config })
    const chain = new MockChain({ config })
    const service = new FullEthereumService({
      config: new Config({ loglevel, servers: [server as any], lightserv: true }),
      chain,
    })
    await service.open()
    await server.start()
    await service.start()
    return [server, service]
  }

  t.test('should handle ETH requests', async (t) => {
    const [server, service] = await setup()
    const peer = await server.accept('peer0')
    const headers = await (peer.eth as any).getBlockHeaders({ block: 1, max: 2 })
    const hash = Buffer.from(
      'a321d27cd2743617c1c1b0d7ecb607dd14febcdfca8f01b79c3f0249505ea069',
      'hex'
    )
    t.ok(headers[1].hash().equals(hash), 'handled GetBlockHeaders')
    const bodies = await (peer.eth as any).getBlockBodies([hash])
    t.deepEquals(bodies, [[[], []]], 'handled GetBlockBodies')
    await (peer.eth as any).send('NewBlockHashes', [[hash, new BN(2)]])
    t.pass('handled NewBlockHashes')
    await destroy(server, service)
    t.end()
  })

  t.test('should handle LES requests', async (t) => {
    const [server, service] = await setup()
    const peer = await server.accept('peer0')
    const { headers } = await (peer.les as any).getBlockHeaders({ block: 1, max: 2 })
    t.equals(
      headers[1].hash().toString('hex'),
      'a321d27cd2743617c1c1b0d7ecb607dd14febcdfca8f01b79c3f0249505ea069',
      'handled GetBlockHeaders'
    )
    await destroy(server, service)
    t.end()
  })
})
