import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { test } from 'node:test'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

const projectRoot = new URL('../', import.meta.url)
const expectedTools = [
  'addToCart',
  'checkout',
  'getCart',
  'getOrders',
  'removeFromCart',
  'searchProducts',
]

async function freePort() {
  const probe = createServer()
  probe.listen(0, '127.0.0.1')
  await once(probe, 'listening')
  const address = probe.address()
  assert.ok(address && typeof address === 'object')
  const port = address.port
  probe.close()
  await once(probe, 'close')
  return port
}

test('real Streamable HTTP exposes the account-based MCP tools', async (t) => {
  const port = await freePort()
  const mockPort = await freePort()
  const mock = spawn(process.execPath, ['server.mjs'], {
    cwd: new URL('../../../01-mock-api/', import.meta.url),
    env: { ...process.env, PORT: String(mockPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  t.after(() => mock.kill())
  const server = spawn(
    process.execPath,
    [
      'node_modules/vite/bin/vite.js',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        NO_COLOR: '1',
        CATALOG_MODE: 'mock',
        MOCK_CATALOG_ORIGIN: `http://127.0.0.1:${mockPort}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  t.after(() => server.kill())
  let diagnostics = ''
  server.stdout.setEncoding('utf8')
  server.stderr.setEncoding('utf8')
  server.stdout.on('data', (chunk) => {
    diagnostics += chunk
  })
  server.stderr.on('data', (chunk) => {
    diagnostics += chunk
  })

  const endpoint = new URL(`http://127.0.0.1:${port}/mcp`)
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(endpoint)
      if (response.status < 500) break
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  const client = new Client({ name: 'http-smoke', version: '1.0.0' })
  t.after(() => client.close())
  await client.connect(new StreamableHTTPClientTransport(endpoint))
  const tools = await client.listTools()
  assert.deepEqual(tools.tools.map(({ name }) => name).sort(), expectedTools)
  assert.equal(
    tools.tools.some(({ name }) => name === 'createCart'),
    false,
  )

  const searchTool = tools.tools.find(({ name }) => name === 'searchProducts')
  const cartTool = tools.tools.find(({ name }) => name === 'getCart')
  assert.equal(searchTool?._meta?.ui, undefined)
  assert.equal(cartTool?._meta?.ui, undefined)
  assert.deepEqual(cartTool?.inputSchema?.required, ['loginId'])

  if (!process.env.EXERCISE_COMPLETE) {
    for (const name of expectedTools) {
      const result = await client.callTool({
        name,
        arguments: {
          loginId: 'hotel-alpenblick',
          term: 'Milch',
          articleNumber: '022600',
          quantity: 1,
        },
      })
      assert.equal(typeof result.structuredContent?.ok, 'boolean')
      assert.ok(result.content.length > 0)
    }
    return
  }
  const cart = await client.callTool({
    name: 'getCart',
    arguments: { loginId: 'restaurant-baeren' },
  })
  assert.deepEqual(cart.structuredContent, {
    ok: true,
    cartId: null,
    items: [],
    totalItems: 0,
    totalAmount: 0,
    loginId: 'restaurant-baeren',
    orders: [],
  })

  const invalid = await client.callTool({
    name: 'getCart',
    arguments: { loginId: 'unknown' },
  })
  assert.equal(invalid.isError, true, diagnostics)
  assert.deepEqual(
    invalid.structuredContent?.validAccounts?.map(({ loginId }) => loginId),
    ['restaurant-baeren', 'hotel-alpenblick', 'kantine-campus'],
  )

  const appCall = await client.callTool({
    name: 'removeFromCart',
    arguments: { loginId: 'restaurant-baeren', articleNumber: 'demo' },
  })
  assert.equal(appCall.isError, true)
  assert.equal(appCall.structuredContent?.loginId, 'restaurant-baeren')
  assert.deepEqual(appCall.structuredContent?.orders, [])

  const session = await fetch(new URL('/api/session', endpoint), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ loginId: 'hotel-alpenblick' }),
  })
  assert.equal(session.status, 200)
  const setCookie = session.headers.get('set-cookie')
  assert.ok(setCookie)
  const cookie = setCookie
    .split(/, (?=[^;]+=)/)
    .map((value) => value.split(';', 1)[0])
    .join('; ')
  for (const quantity of [1, 2]) {
    const added = await client.callTool({
      name: 'addToCart',
      arguments: {
        loginId: 'hotel-alpenblick',
        articleNumber: '022600',
        quantity,
      },
    })
    assert.equal(added.structuredContent?.ok, true, diagnostics)
  }
  const webCart = await fetch(new URL('/api/cart', endpoint), {
    headers: { cookie },
  })
  assert.equal(webCart.status, 200)
  const cartFromWeb = await webCart.json()
  assert.equal(cartFromWeb.items.length, 1)
  assert.equal(cartFromWeb.items[0].quantity, 3)
  assert.equal(
    (
      await client.callTool({
        name: 'getCart',
        arguments: { loginId: 'restaurant-baeren' },
      })
    ).structuredContent?.totalItems,
    0,
  )

  const checkedOut = await client.callTool({
    name: 'checkout',
    arguments: { loginId: 'hotel-alpenblick' },
  })
  const orderId = checkedOut.structuredContent?.orderId
  assert.equal(typeof orderId, 'string')
  const ordersResponse = await fetch(new URL('/api/orders', endpoint), {
    headers: { cookie },
  })
  assert.equal(ordersResponse.status, 200)
  const ordersFromWeb = await ordersResponse.json()
  assert.equal(ordersFromWeb.orders[0].orderId, orderId)
  const next = await client.callTool({
    name: 'addToCart',
    arguments: {
      loginId: 'hotel-alpenblick',
      articleNumber: '022600',
      quantity: 1,
    },
  })
  assert.notEqual(next.structuredContent?.cartId, orderId)
})

test('real stdio uses the same MCP server factory', async (t) => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['src/features/mcp/stdio.ts'],
    cwd: new URL('.', projectRoot).pathname,
    stderr: 'inherit',
  })
  const client = new Client({ name: 'stdio-smoke', version: '1.0.0' })
  t.after(() => client.close())
  await client.connect(transport)
  const tools = await client.listTools()
  assert.deepEqual(tools.tools.map(({ name }) => name).sort(), expectedTools)
  const result = await client.callTool({
    name: 'getCart',
    arguments: { loginId: 'hotel-alpenblick' },
  })
  assert.equal(typeof result.structuredContent?.ok, 'boolean')
  if (process.env.EXERCISE_COMPLETE)
    assert.equal(result.structuredContent?.ok, true)
})
