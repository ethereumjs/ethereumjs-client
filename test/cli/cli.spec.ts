import { spawn } from 'child_process'
import tape from 'tape'

tape('[CLI]', (t) => {
  t.test('should begin downloading blocks', { timeout: 260000 }, (t) => {
    const file = require.resolve('../../dist/bin/cli.js')
    const child = spawn(process.execPath, [file])

    const timeout = setTimeout(() => {
      child.kill('SIGINT')
      t.fail('timed out before finishing')
      t.end()
    }, 240000)

    const end = () => {
      clearTimeout(timeout)
      child.kill('SIGINT')
      t.end()
    }

    child.stdout.on('data', (data) => {
      const message = data.toString()
      if (message.toLowerCase().includes('error')) {
        t.fail(message)
        end()
      }
      if (message.includes('Imported blocks')) {
        t.pass('successfully imported blocks')
        end()
      }
      // log for easier debugging
      // eslint-disable-next-line no-console
      console.log(message)
    })

    child.stderr.on('data', (data) => {
      const message = data.toString()
      t.fail(`stderr: ${message}`)
      end()
    })

    child.on('close', (code) => {
      if (code !== 0) {
        t.fail(`child process exited with code ${code}`)
        end()
      }
    })
  })
})
