import assert from 'node:assert/strict'
import { test } from 'node:test'
import { shopTools, registerShopTools } from './webmcp-tools.ts'

test('tool scaffold loads without a native browser and has a callable cleanup', () => {
  assert.equal(
    new Set(shopTools.map((tool) => tool.name)).size,
    shopTools.length,
  )
  const cleanup = registerShopTools({
    registerTool() {
      return Promise.resolve()
    },
  } as unknown as WebMCPModelContext)
  assert.equal(typeof cleanup, 'function')
  cleanup()
})
