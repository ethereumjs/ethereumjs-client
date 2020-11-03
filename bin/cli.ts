#!/usr/bin/env node

const chains = require('@ethereumjs/common/dist/chains').chains
const { getLogger } = require('../lib/logging')
const { parseParams, parseTransports } = require('../lib/util')
const { fromName: serverFromName } = require('../lib/net/server')
import Node from '../lib/node'
import { Server as RPCServer } from 'jayson'
import { Config } from '../lib/config'
import {Logger} from 'winston'
const RPCManager = require('../lib/rpc')
const level = require('level')
const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const yargs = require('yargs')

type UserConfig = {
  logger? : Logger
}

const networks = Object.entries(chains.names)
const args = yargs
  .options({
    config: {
      describe: 'Path to ethereumjs.config.js',
      default: undefined,
    },
    network: {
      describe: `Network`,
      choices: networks.map((n) => n[1]),
      default: networks[0][1],
    },
    'network-id': {
      describe: `Network ID`,
      choices: networks.map((n) => parseInt(n[0])),
      default: undefined,
    },
    syncmode: {
      describe: 'Blockchain sync mode',
      choices: ['light', 'fast'],
      default: 'fast',
    },
    lightserv: {
      describe: 'Serve light peer requests',
      boolean: true,
      default: false,
    },
    datadir: {
      describe: 'Data directory for the blockchain',
      default: `${os.homedir()}/Library/Ethereum`,
    },
    transports: {
      describe: 'Network transports',
      default: ['rlpx:port=30303', 'libp2p'],
      array: true,
    },
    rpc: {
      describe: 'Enable the JSON-RPC server',
      boolean: true,
      default: false,
    },
    rpcport: {
      describe: 'HTTP-RPC server listening port',
      number: true,
      default: 8545,
    },
    rpcaddr: {
      describe: 'HTTP-RPC server listening interface',
      default: 'localhost',
    },
    loglevel: {
      describe: 'Logging verbosity',
      choices: ['error', 'warn', 'info', 'debug'],
      default: 'info',
    },
    minPeers: {
      describe: 'Peers needed before syncing',
      number: true,
      default: 2,
    },
    maxPeers: {
      describe: 'Maximum peers to sync with',
      number: true,
      default: 25,
    },
    params: {
      describe: 'Path to chain parameters json file',
      coerce: path.resolve,
    },
  })
  .locale('en_EN').argv

const config: UserConfig = {}

if (args.config) {
  const userConfig: UserConfig = <UserConfig>require(
    path.resolve(process.cwd(), args.config)
  )

  Object.assign(config, userConfig)
}

const logger = config.logger ?? getLogger({ loglevel: args.loglevel })

async function runNode(options: any) {
  logger.info('Initializing Ethereumjs client...')
  if (options.lightserv) {
    logger.info(`Serving light peer requests`)
  }
  const node = new Node(options)
  node.on('error', (err: any) => logger.error(err))
  node.on('listening', (details: any) => {
    logger.info(`Listener up transport=${details.transport} url=${details.url}`)
  })
  node.on('synchronized', () => {
    logger.info('Synchronized')
  })
  logger.info(`Connecting to network: ${options.config.common.chainName()}`)
  await node.open()
  logger.info('Synchronizing blockchain...')
  await node.start()

  return node
}

function runRpcServer(node: any, options: any) {
  const { rpcport, rpcaddr } = options
  const manager = new RPCManager(node, options)
  const server = new RPCServer(manager.getMethods())
  logger.info(`RPC HTTP endpoint opened: http://${rpcaddr}:${rpcport}`)
  server.http().listen(rpcport)

  return server
}

async function run() {
  const syncDirName = args.syncmode === 'light' ? 'lightchaindata' : 'chaindata'
  // give network id precedence over network name
  if (args.networkId) {
    const network = networks.find((n) => n[0] === `${args.networkId}`)
    if (network) {
      args.network = network[1]
    }
  }
  const networkDirName = args.network === 'mainnet' ? '' : `${args.network}/`

  // TODO: see todo below wrt resolving chain param parsing
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const chainParams = args.params ? await parseParams(args.params) : args.network

  const config = new Config()
  const servers = parseTransports(args.transports).map((t: any) => {
    const Server = serverFromName(t.name)
    if (t.name === 'rlpx') {
      t.options.bootnodes = t.options.bootnodes || config.common.bootstrapNodes()
    }
    return new Server({ logger, ...t.options })
  })
  const dataDir = `${args.datadir}/${networkDirName}ethereumjs/${syncDirName}`

  fs.ensureDirSync(dataDir)
  logger.info(`Data directory: ${dataDir}`)

  const options = {
    config,
    logger,
    servers,
    syncmode: args.syncmode,
    lightserv: args.lightserv,
    db: level(dataDir),
    rpcport: args.rpcport,
    rpcaddr: args.rpcaddr,
    minPeers: args.minPeers,
    maxPeers: args.maxPeers,
  }

  let node: Node|null
  let server: RPCServer|null

  process.once('SIGINT', async () => {
    process.once('SIGINT', () => {
      logger.info('Force shutdown. Exit immediately.')
      process.exit(1)
    })
    logger.info('Caught interrupt signal. Shutting down...')
    if (server) server.http().close()
    if (node) await node.stop()
    logger.info('Exiting.')
    process.exit(0)
  })

  node = await runNode(options)
  server = args.rpc ? runRpcServer(node, options) : null
}

run().catch((err) => logger.error(err))
