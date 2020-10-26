#!/usr/bin/env node

import { Server as RPCServer } from 'jayson'
const level = require('level')
import os = require('os')
const path = require('path')
const fs = require('fs-extra')

import Common from'ethereumjs-common'
const chains = require('ethereumjs-common/dist/chains').chains

import { getLogger } from '../lib/logging'
import { parseParams, parseTransports } from '../lib/util'
import { Libp2pServer, RlpxServer, Server } from '../lib/net/server'
import Node from '../lib/node'
import { NodeOptions } from '../lib/types'
import { RPCManager } from '../lib/rpc'

const networks = Object.entries(chains.names)
const args = require('yargs')
  .options({
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
const logger = getLogger({ loglevel: args.loglevel })

async function runNode(options: NodeOptions) {
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
  logger.info(`Connecting to network: ${options.common!.chainName()}`)
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
  const chainParams = args.params ? await parseParams(args.params) : args.network
  // Initialize Common with an explicit 'chainstart' HF set until
  // hardfork awareness is implemented within the library
  // Also a fix for https://github.com/ethereumjs/ethereumjs-vm/issues/757
  const common = new Common(chainParams, 'chainstart')
  const servers: Server[] = parseTransports(args.transports).map((t) => {
    if (t.name === 'rlpx') {
      t.options.bootnodes = t.options.bootnodes || common.bootstrapNodes()
      return new RlpxServer({ logger, ...t.options })
    } else {
      return new Libp2pServer({ logger, ...t.options })
    }
  })
  const dataDir = `${args.datadir}/${networkDirName}ethereumjs/${syncDirName}`

  fs.ensureDirSync(dataDir)
  logger.info(`Data directory: ${dataDir}`)

  const options: NodeOptions = {
    common,
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
  const node = await runNode(options)
  const server = args.rpc ? runRpcServer(node, options) : null

  process.on('SIGINT', async () => {
    logger.info('Caught interrupt signal. Shutting down...')
    if (server) server.http().close()
    await node.stop()
    logger.info('Exiting.')
    process.exit()
  })
}

run().catch((err) => logger.error(err))
