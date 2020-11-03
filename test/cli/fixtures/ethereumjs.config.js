function send(level, message) {
  process.send([level, message])
}

module.exports = {
  logger: {
    warn: send.bind(null, 'warn'),
    info: send.bind(null, 'info'),
    debug: send.bind(null, 'debug'),
    error: send.bind(null, 'error'),
  }
}
