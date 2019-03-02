'use strict'

const Server = require('../../../lib/net/server/rlpxserver');
const MockPeer = require('./mockpeer')
const network = require('./network')

class MockServer extends Server {
  constructor (options = {}) {
    super(options);
    this.location = options.location || '127.0.0.1';
    this.server = null;
    this.peers = {};
  }

  get name () {
    return 'mock';
  }

  async start () {
    if (this.started) {
      return
    }
    await super.start();

    if (this.location) {
      this.server = network.createServer(this.location);
      this.server.on('listening', () => {
        this.emit('listening', {
          url: `mock://${this.location}`
        });
      });
    }
    this.server.on('connection', connection => {
      this.connect(connection);
    })
  }

  async stop () {
    return new Promise(resolve => {
      setTimeout(() => {
        network.destroyServer(this.location);
        super.stop();
        console.log('destroyed!');
        resolve();
      }, 20);
    });
  }

  async discover (id, location) {
    const peer = new MockPeer({id, location, protocols: Array.from(this.protocols)})
    await peer.connect()
    this.peers[id] = peer
    this.emit('connected', peer)
    return peer
  }

  async accept (id) {
    const peer = new MockPeer({id, protocols: Array.from(this.protocols)})
    await peer.accept(this)
    return peer
  }

  async connect (connection) {
    const id = connection.remoteId
    const peer = new MockPeer({id, inbound: true, server: this, protocols: Array.from(this.protocols)})
    await peer.bindProtocols(connection)
    this.peers[id] = peer
    this.emit('connected', peer)
  }

  disconnect (id) {
    const peer = this.peers[id]
    if (peer) this.emit('disconnected', peer)
  }
}

module.exports = MockServer
