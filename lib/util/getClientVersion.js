'use strict'
const { platform } = require('os')

const packageVersion = require('../../package.json').version

const getClientVersion = () => {
  const { version } = process
  return `EthereumJS/${packageVersion}/${platform()}/node${version.substring(1)}`
}

module.exports = getClientVersion