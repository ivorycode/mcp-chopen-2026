import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { resolveProvider } from './adapter.server.ts'

const original = { ...process.env }
afterEach(() => {
  process.env = { ...original }
})
for (const provider of ['openai', 'anthropic', 'google']) {
  test(`selects ${provider}`, () => {
    process.env.AI_PROVIDER = provider
    assert.equal(resolveProvider(), provider)
  })
}
test('rejects an unknown provider', () => {
  process.env.AI_PROVIDER = 'other'
  assert.throws(resolveProvider, /Unbekannter AI_PROVIDER/)
})
