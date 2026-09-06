import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { API_KEY_VARIABLES, resolveProvider } from './provider.ts'

const original = { ...process.env }
afterEach(() => { process.env = { ...original } })

for (const provider of ['openai', 'anthropic', 'google'] as const) {
  test(`resolves local ${provider} configuration`, () => {
    process.env.AI_PROVIDER = provider
    process.env[API_KEY_VARIABLES[provider]] = 'test-key'
    assert.equal(resolveProvider(), provider)
  })
}
test('rejects unknown provider configuration clearly', () => {
  process.env.AI_PROVIDER = 'other'
  assert.throws(resolveProvider, /openai, anthropic oder google/)
})
