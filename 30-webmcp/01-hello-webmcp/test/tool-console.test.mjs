import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const consoleSource = await readFile(new URL('../public/tool-console.js', import.meta.url), 'utf8')
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8')

// Chrome's discovered schemas and executeTool inputs are JSON strings.
function modelContext() {
  const tools = [
    { name: 'addTodo', inputSchema: JSON.stringify({ properties: { text: {}, priority: {} } }) },
    { name: 'listTodos', inputSchema: JSON.stringify({ properties: {} }) },
    { name: 'removeTodo', inputSchema: JSON.stringify({ properties: { id: {} } }) },
  ]
  const calls = []
  return {
    calls,
    getTools: async () => tools,
    addEventListener() {},
    async executeTool(tool, input) {
      assert.ok(tools.includes(tool), 'Pass the discovered tool descriptor')
      let parsed
      try {
        // Mirror DOMString conversion followed by Chrome's JSON parser.
        parsed = JSON.parse(String(input))
      } catch {
        throw new Error('Failed to parse input arguments')
      }
      calls.push({ name: tool.name, input: parsed })
      return JSON.stringify({ ok: true })
    },
  }
}

async function loadConsole() {
  const context = modelContext()
  const elements = new Map()
  function element() {
    return {
      value: '', textContent: '', listeners: {},
      addEventListener(name, callback) { this.listeners[name] = callback },
      replaceChildren(...children) { this.value = children[0]?.value ?? '' },
    }
  }
  const document = {
    modelContext: context,
    createElement: element,
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, element())
      return elements.get(selector)
    },
  }
  await new AsyncFunction('document', consoleSource)(document)
  return { context, get: (selector) => document.querySelector(selector) }
}

test('tool console builds input templates from discovered JSON schemas', async () => {
  const { get } = await loadConsole()
  assert.deepEqual(JSON.parse(get('#tool-input').value), { text: '', priority: '' })
  get('#tool-select').value = 'removeTodo'
  get('#tool-select').listeners.change()
  assert.deepEqual(JSON.parse(get('#tool-input').value), { id: '' })
})

test('tool console sends valid serialized inputs and rejects malformed JSON locally', async () => {
  const { context, get } = await loadConsole()
  for (const [name, input] of [
    ['listTodos', {}],
    ['addTodo', { text: 'Butter', priority: 'hoch' }],
    ['removeTodo', { id: 3 }],
  ]) {
    get('#tool-select').value = name
    get('#tool-input').value = JSON.stringify(input)
    await get('#execute').listeners.click()
    assert.deepEqual(JSON.parse(get('#tool-output').textContent), { ok: true })
    assert.deepEqual(context.calls.at(-1), { name, input })
  }
  get('#tool-input').value = '{'
  await get('#execute').listeners.click()
  assert.match(get('#tool-output').textContent, /^Fehler:/)
  assert.equal(context.calls.length, 3)
})

test('README execution snippets pass Chrome-compatible input arguments', async () => {
  const context = modelContext()
  const snippets = [...readme.matchAll(/```js\n([\s\S]*?)```/g)]
    .map((match) => match[1]).filter((code) => code.includes('executeTool('))
  assert.equal(snippets.length, 3)
  for (const snippet of snippets) {
    await new AsyncFunction('document', snippet)({ modelContext: context })
  }
  assert.deepEqual(context.calls, [
    { name: 'addTodo', input: { text: 'Butter', priority: 'hoch' } },
    { name: 'listTodos', input: {} },
    { name: 'removeTodo', input: { id: 1 } },
  ])
})
