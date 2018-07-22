'use strict'

const EventEmitter = require('events')

/**
 * Base class for transport specific message sender/receiver. Subclasses should
 * emit a message event when the sender receives a new message, and they should
 * emit a status event when the sender receives a handshake status message
 * @emits message
 * @emits status
 * @memberof module:net/protocol
 */
class Sender extends EventEmitter {
  /**
   * Send a status to peer
   * @protected
   * @param  {Object} status
   */
  sendStatus (status) {
    throw new Error('Unimplemented')
  }

  /**
   * Send a message to peer
   * @protected
   * @param  {number} code message code
   * @param  {Array|Buffer} rlpEncodedData rlp encoded message payload
   */
  sendMessage (code, rlpEncodedData) {
    throw new Error('Unimplemented')
  }
}

module.exports = Sender
