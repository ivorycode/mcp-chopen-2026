// Tests des vierten Tools. Der Katalog wird über einen fetch-Stub ersetzt:
// Die Tests laufen ohne Mock-API, ohne Netzwerk und ohne API-Key.

import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { articleDetail, getArticleDetailInput, shopTools } from './shop-tools.ts'

const originalFetch = globalThis.fetch
const originalOrigin = process.env.TRANSGOURMET_API_ORIGIN

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env.TRANSGOURMET_API_ORIGIN = originalOrigin
})

/** Antwortet auf jeden Aufruf mit der übergebenen Katalog-Antwort und merkt sich die URL. */
function stubCatalog(status: number, body: unknown): { urls: Array<string> } {
  const urls: Array<string> = []
  globalThis.fetch = (async (input: string | URL | Request) => {
    urls.push(String(input))
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  return { urls }
}

test('registriert vier Tools mit Beschreibung und Schema', () => {
  assert.deepEqual(Object.keys(shopTools), ['searchProducts', 'getArticleDetail', 'getCart', 'addToCart'])
  for (const [name, definition] of Object.entries(shopTools)) {
    assert.ok(definition.description, `${name} braucht eine Beschreibung für das Modell`)
    assert.ok(definition.inputSchema, `${name} braucht ein Eingabe-Schema`)
  }
})

test('verlangt eine nicht leere Artikelnummer', () => {
  assert.equal(getArticleDetailInput.safeParse({ articleNumber: '022600' }).success, true)
  assert.equal(getArticleDetailInput.safeParse({ articleNumber: '  ' }).success, false)
  assert.equal(getArticleDetailInput.safeParse({}).success, false)
})

test('liefert Zutaten, Allergene und Preis eines Artikels', async () => {
  process.env.TRANSGOURMET_API_ORIGIN = 'http://catalog.test'
  const stub = stubCatalog(200, {
    article: {
      articleNumber: '022600',
      description: 'Quality Vollmilch 3,5%, UHT, 12 x 1 l',
      price: 1.29,
      unitText: 'Tp',
      ingredients: 'Milch',
      durability: 'Gekühlt lagern.',
      allergenContains: [
        { id: 24, text: 'Laktose' },
        { id: 7, text: 'Milch' },
      ],
      allergenMayContains: [{ id: 5, text: 'Soja' }],
    },
  })

  const result = await articleDetail({ articleNumber: '022600' })

  assert.deepEqual(stub.urls, ['http://catalog.test/de/webshop/resources/articles/022600/detail'])
  assert.deepEqual(result, {
    ok: true,
    articleNumber: '022600',
    description: 'Quality Vollmilch 3,5%, UHT, 12 x 1 l',
    price: 1.29,
    unitText: 'Tp',
    ingredients: 'Milch',
    durability: 'Gekühlt lagern.',
    allergens: ['Laktose', 'Milch'],
    mayContain: ['Soja'],
  })
})

test('meldet eine unbekannte Artikelnummer als Wert statt als Ausnahme', async () => {
  stubCatalog(404, { message: 'not found' })

  const result = await articleDetail({ articleNumber: '000000' })

  assert.equal(result.ok, false)
  assert.match(result.ok === false ? result.error : '', /404/)
})

test('meldet eine nicht erreichbare Katalog-API als Wert', async () => {
  globalThis.fetch = (async () => {
    throw new Error('connect ECONNREFUSED')
  }) as typeof fetch

  const result = await articleDetail({ articleNumber: '022600' })

  assert.equal(result.ok, false)
  assert.match(result.ok === false ? result.error : '', /Katalog-API nicht erreichbar/)
})
