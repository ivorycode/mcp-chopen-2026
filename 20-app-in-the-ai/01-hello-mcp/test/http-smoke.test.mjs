import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { test } from 'node:test'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const projectRoot = new URL('../', import.meta.url)

async function startServer(t) {
  const probe = createServer()
  probe.listen(0, '127.0.0.1')
  await once(probe, 'listening')
  const address = probe.address()
  assert.ok(address && typeof address === 'object')
  const port = address.port
  probe.close()
  await once(probe, 'close')

  const server = spawn(process.execPath, ['src/http.ts'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  t.after(() => server.kill())

  let output = ''
  server.stdout.setEncoding('utf8')
  server.stderr.setEncoding('utf8')
  server.stderr.on('data', (chunk) => (output += chunk))

  const [chunk] = await once(server.stdout, 'data')
  output += chunk
  const match = output.match(/http:\/\/localhost:(\d+)\/mcp/)
  assert.ok(match, `Server did not report its endpoint: ${output}`)
  return new URL(`http://127.0.0.1:${match[1]}/mcp`)
}

test('SDK default client can call the public HTTP tool', async (t) => {
  const endpoint = await startServer(t)
  const client = new Client({ name: 'public-smoke-test', version: '1.0.0' })
  t.after(() => client.close())

  await client.connect(new StreamableHTTPClientTransport(endpoint))
  const result = await client.callTool({ name: 'add', arguments: { a: 20, b: 22 } })

  assert.deepEqual(result.structuredContent, { sum: 42 })
})
