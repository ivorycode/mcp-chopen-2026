// Hello WebMCP: deklaratives Formular-Tool und imperative Tools über eine Todo-Liste.
// Bewusst ohne Feature-Detection: Ohne WebMCP-Unterstützung (Chrome-Flag
// chrome://flags/#enable-webmcp-testing) endet dieses Skript mit einem Fehler in der Konsole.

const list = document.querySelector('#todos')
const form = document.querySelector('#todo-form')
let nextId = list.children.length + 1

function todos() {
  return [...list.querySelectorAll('li')].map((li) => ({
    id: Number(li.dataset.id),
    text: li.firstChild.textContent.trim(),
    priority: li.querySelector('small').textContent,
  }))
}

function addTodo(text, priority) {
  const li = document.createElement('li')
  li.dataset.id = String(nextId++)
  li.append(`${text} `, Object.assign(document.createElement('small'), { textContent: priority }))
  list.append(li)
  return { id: Number(li.dataset.id), text, priority }
}

// --- 1. Deklaratives Tool: der submit-Handler liefert das Resultat an den Agenten ---
form.addEventListener('submit', (event) => {
  event.preventDefault()
  const data = Object.fromEntries(new FormData(form))
  const added = addTodo(data.text, data.priority)

  // Nur wenn ein Agent das Formular ausgelöst hat, gibt es respondWith().
  if (event.agentInvoked) {
    event.respondWith(Promise.resolve({ ok: true, added, count: todos().length }))
  } else {
    // reset() würde einen noch laufenden WebMCP-Tool-Aufruf abbrechen.
    form.reset()
  }
})

// --- 2. Imperative Tools: registerTool() mit AbortController zum Abmelden ---
const controller = new AbortController()
const { signal } = controller

await document.modelContext.registerTool(
  {
    name: 'listTodos',
    description: 'Liefert alle Todos der sichtbaren Liste mit id, text und priority.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    // Rückgabewert: beliebiger JSON-Wert, der Browser serialisiert ihn für den Agenten.
    execute: () => todos(),
  },
  { signal },
)

await document.modelContext.registerTool(
  {
    name: 'removeTodo',
    description: 'Entfernt ein Todo anhand seiner id aus der Liste.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'integer', description: 'Die id des Todos (siehe listTodos).' } },
      required: ['id'],
    },
    annotations: { readOnlyHint: false },
    execute: ({ id }) => {
      const li = list.querySelector(`li[data-id="${id}"]`)
      if (!li) return { ok: false, error: `Todo ${id} nicht gefunden.` }
      li.remove()
      return { ok: true, removed: id, count: todos().length }
    },
  },
  { signal },
)

document.modelContext.addEventListener('toolchange', async () => {
  const names = (await document.modelContext.getTools()).map((t) => t.name)
  console.log('toolchange:', names)
})

// Zum Ausprobieren in der DevTools-Konsole: window.webmcpController.abort()
// entfernt die beiden imperativen Tools wieder (das Formular-Tool bleibt).
window.webmcpController = controller
