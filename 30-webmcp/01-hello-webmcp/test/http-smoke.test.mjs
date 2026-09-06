import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { test } from 'node:test'

const projectRoot = new URL('../', import.meta.url)

async function availablePort() {
  const probe = createServer()
  probe.listen(0, '127.0.0.1')
  await once(probe, 'listening')
  const address = probe.address()
  assert.ok(address && typeof address === 'object')
  probe.close()
  await once(probe, 'close')
  return address.port
}

async function startServer(t) {
  const port = await availablePort()
  const server = spawn(process.execPath, ['server.mjs'], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  t.after(() => server.kill())
  const [output] = await once(server.stdout, 'data')
  assert.match(String(output), new RegExp(`http://localhost:${port}`))
  return `http://127.0.0.1:${port}`
}

test('standalone server delivers the declarative and imperative WebMCP demo', async (t) => {
  const origin = await startServer(t)

  const page = await fetch(origin)
  assert.equal(page.status, 200)
  assert.match(page.headers.get('content-type') ?? '', /^text\/html; charset=utf-8$/)
  const html = await page.text()
  assert.match(html, /toolname="addTodo"/)
  assert.match(html, /toolautosubmit/)

  const tools = await fetch(`${origin}/tools.js`)
  assert.equal(tools.status, 200)
  assert.match(tools.headers.get('content-type') ?? '', /^text\/javascript; charset=utf-8$/)
  const javascript = await tools.text()
  assert.match(javascript, /name: 'listTodos'/)
  assert.match(javascript, /name: 'removeTodo'/)

  assert.equal((await fetch(`${origin}/missing.js`)).status, 404)
})
