import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const source = await readFile(new URL('../public/tools.js', import.meta.url), 'utf8')

for (const agentInvoked of [true, false]) {
  test(`Todo submit returns an agent result or resets a manual form (agentInvoked=${agentInvoked})`, async () => {
    let submit
    let resetCount = 0
    let result
    const form = {
      addEventListener(name, callback) { if (name === 'submit') submit = callback },
      reset() {
        if (agentInvoked) throw new Error('Tool execution cancelled by a form reset')
        resetCount++
      },
    }
    const list = {
      children: [],
      append(li) { this.children.push(li) },
      querySelectorAll() { return this.children },
    }
    const document = {
      querySelector: (selector) => selector === '#todos' ? list : form,
      createElement: () => ({
        dataset: {},
        append(text, small) { this.firstChild = { textContent: text }; this.small = small },
        querySelector() { return this.small },
      }),
      modelContext: { registerTool: async () => {}, addEventListener() {} },
    }
    function FormData(actualForm) {
      assert.equal(actualForm, form)
      return [['text', 'Butter'], ['priority', 'hoch']]
    }
    await new AsyncFunction('document', 'window', 'FormData', source)(document, {}, FormData)
    let prevented = false
    submit({
      agentInvoked,
      preventDefault() { prevented = true },
      respondWith(promise) { result = promise },
    })
    assert.equal(prevented, true)
    assert.equal(list.children.length, 1)
    assert.equal(list.children[0].firstChild.textContent, 'Butter ')
    assert.equal(resetCount, agentInvoked ? 0 : 1)
    assert.deepEqual(await result, agentInvoked
      ? { ok: true, added: { id: 1, text: 'Butter', priority: 'hoch' }, count: 1 }
      : undefined)
  })
}
