import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SHOP_SEARCH_EVENT } from '../../lib/shop-events.ts'
import { shopTools, registerShopTools } from './webmcp-tools.ts'

test('registers the available tools without a native browser and cleans them up', () => {
  assert.equal(
    new Set(shopTools.map((tool) => tool.name)).size,
    shopTools.length,
  )
  assert.ok(shopTools.some((tool) => tool.name === 'searchProducts'))
  const registrations: Array<WebMCPModelContextTool> = []
  const signals: Array<AbortSignal> = []
  const cleanup = registerShopTools({
    registerTool(tool, options) {
      registrations.push(tool)
      assert.ok(options?.signal)
      signals.push(options.signal)
      return Promise.resolve()
    },
  } as WebMCPModelContext)
  assert.deepEqual(registrations, shopTools)
  assert.equal(new Set(signals).size, 1)
  assert.ok(signals.every((signal) => !signal.aborted))
  assert.equal(typeof cleanup, 'function')
  cleanup()
  assert.ok(signals.every((signal) => signal.aborted))
})

test('search limits results and publishes the API search term to the shop', async (t) => {
  const target = new EventTarget()
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: target })
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
    else Reflect.deleteProperty(globalThis, 'window')
  })
  const terms: Array<string> = []
  target.addEventListener(SHOP_SEARCH_EVENT, (event) => {
    terms.push((event as CustomEvent<{ term: string }>).detail.term)
  })
  const articles = Array.from({ length: 7 }, (_, index) => ({
    articleNumber: String(index),
  }))
  t.mock.method(globalThis, 'fetch', async (input: unknown) => {
    assert.equal(String(input), '/api/search?term=milch')
    return Response.json({ searchTerm: 'Milch', totalCount: 12, articles })
  })
  const searchTool = shopTools.find((tool) => tool.name === 'searchProducts')
  assert.ok(searchTool)
  assert.deepEqual(await searchTool.execute({ term: 'milch' }), {
    ok: true,
    searchTerm: 'Milch',
    totalCount: 12,
    shownCount: 5,
    articles: articles.slice(0, 5),
  })
  assert.deepEqual(terms, ['Milch'])
})

test('search rejects invalid input without calling the API', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Unexpected fetch')
  })
  const searchTool = shopTools.find((tool) => tool.name === 'searchProducts')
  assert.ok(searchTool)
  const result = (await searchTool.execute({ term: '' })) as {
    ok: boolean
    error: string
  }
  assert.equal(result.ok, false)
  assert.match(result.error, /Ungültige Eingabe/)
  assert.equal(fetch.mock.callCount(), 0)
})
