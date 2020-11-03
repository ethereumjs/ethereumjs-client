import path from 'path'
import { spawn } from 'child_process'

import tape from 'tape'

tape('[CLI]', (t) => {
  t.test('should handle SIGINT', { timeout: 160000 }, (t) => {
    t.plan(1)
    const file = require.resolve('../../dist/bin/cli.js')
    const child = spawn(process.execPath, [
      file,
      '--config',
      path.join(__dirname, '/fixtures/ethereumjs.config.js')
    ], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    })

    const timeout = setTimeout(() => {
      child.kill('SIGINT')
    }, 120000)

    const end = () => {
      clearTimeout(timeout)
      child.kill('SIGINT')
      t.end()
    }

    function onServiceStarted([level, message]: [string, string]) {
      if (level === 'info') {
        if (message === 'Started eth service.') {
          child.removeListener('message', onServiceStarted)
          child.on('message', onFirstSigintSent)
          child.kill('SIGINT')
        }
      }
    }

    function onFirstSigintSent([level, message]: [string, string]) {
      if (level === 'info') {
        if (message === 'Exiting.') {
          child.removeListener('message', onFirstSigintSent)
          t.pass('Client exited')
          clearTimeout(timeout)
        }
      }
    }

    child.on('message', onServiceStarted)
    child.on('message', ([level, message]: [string, string]) => console.log(level, message))

    child.on('error', (error) => {
      t.fail(`Error: ${error}`)
    })

    child.on('close', (code, signal) => {
      if (code !== 0) {
        t.fail(`child process exited with code ${code}, signal ${signal}`)
        end()
      }
    })
  })
})
