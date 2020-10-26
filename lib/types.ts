import { Logger } from 'winston'
import Common from 'ethereumjs-common'
import { Chain } from './blockchain'
import { Server } from './net/server'

export interface NodeOptions {
    /**
     * A Common object determining the chain and HF setup
     */
    common?: Common,
    /**
     * Logger (winston) with log level used
     */
    logger?: Logger,
    /**
     * Transport servers (RLPx or Libp2p)
     */
    servers?: Server[],
    /**
     * Syncmode (light or fast)
     */
    syncmode?: string,
    /**
     * Serv light peer requests
     */
    lightserv?: boolean,
    /**
     * Level DB instance
     * TODO: update tye
     */
    db?: any,
    /**
     * HTTP-RPC server listening port
     */
    rpcport?: number,
    /**
     * HTTP-RPC server listening interface
     */
    rpcaddr?: string,
    /**
     * Peers needed before syncing
     */
    minPeers?: number,
    /**
     * Maximum peers to sync with
     */
    maxPeers?: number,
}

export interface ServiceOptions extends NodeOptions {
    /**
     * Blockchain object to operate on
     */
    chain?: Chain,
    /**
     * Sync retry interval
     */
    interval?: number,
    /**
     * Protocol timeout
     */
    timeout?: number,
}