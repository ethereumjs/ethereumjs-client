import { Config } from '../../lib/config'
import { FastEthereumService, LightEthereumService } from '../../lib/service'
import MockServer from './mocks/mockserver'
import MockChain from './mocks/mockchain'

interface SetupOptions {
  location?: string
  height?: number
  interval?: number
  syncmode?: string
}

export async function setup(
  options: SetupOptions = {}
): Promise<[MockServer, FastEthereumService | LightEthereumService]> {
  const loglevel = 'error'
  const config = new Config({ loglevel, transports: [] })
  const { location, height, interval, syncmode } = options
  const server = new MockServer({ config, location })
  const chain = new MockChain({ config, height })
  const serviceOpts = {
    config: new Config({ loglevel, servers: [server as any], minPeers: 1 }),
    chain,
    interval: interval ?? 10,
  }
  const service =
    syncmode === 'light'
      ? new LightEthereumService(serviceOpts)
      : new FastEthereumService({
          ...serviceOpts,
          lightserv: true,
        })
  await service.open()
  await service.start()
  return [server, service]
}

export async function destroy(
  server: MockServer,
  service: FastEthereumService | LightEthereumService
): Promise<void> {
  await server.stop()
  await service.stop()
}

export async function wait(delay: number) {
  await new Promise((resolve) => setTimeout(resolve, delay))
}