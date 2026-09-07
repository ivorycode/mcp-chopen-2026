// Tool-Konsole: macht getTools() und executeTool() auf der Seite bedienbar,
// damit die Tools auch ohne Agent oder Inspector-Extension getestet werden können.

const select = document.querySelector('#tool-select')
const info = document.querySelector('#tool-info')
const input = document.querySelector('#tool-input')
const output = document.querySelector('#tool-output')

let tools = []

async function refresh() {
  tools = await document.modelContext.getTools()
  select.replaceChildren(
    ...tools.map((t) => Object.assign(document.createElement('option'), { value: t.name, textContent: t.name })),
  )
  showInfo()
}

function showInfo() {
  const tool = tools.find((t) => t.name === select.value)
  if (!tool) return (info.textContent = '')
  // getTools() liefert inputSchema in Chrome als JSON-String.
  const schema = JSON.parse(tool.inputSchema)
  info.textContent = `${tool.description}\nreadOnlyHint: ${tool.annotations?.readOnlyHint ?? false}\ninputSchema: ${JSON.stringify(schema)}`
  const props = Object.keys(schema.properties ?? {})
  input.value = JSON.stringify(Object.fromEntries(props.map((p) => [p, ''])))
}

async function execute() {
  const tool = tools.find((t) => t.name === select.value)
  if (!tool) return
  try {
    // Eingabe lokal validieren; Chrome erwartet und liefert JSON-Strings
    // (Resultat null bei Navigation).
    const raw = await document.modelContext.executeTool(tool, JSON.stringify(JSON.parse(input.value)))
    output.textContent = raw === null ? 'null (Navigation)' : JSON.stringify(JSON.parse(raw), null, 2)
  } catch (error) {
    output.textContent = `Fehler: ${error.message ?? error}`
  }
}

select.addEventListener('change', showInfo)
document.querySelector('#refresh').addEventListener('click', refresh)
document.querySelector('#execute').addEventListener('click', execute)
document.modelContext.addEventListener('toolchange', refresh)

await refresh()
