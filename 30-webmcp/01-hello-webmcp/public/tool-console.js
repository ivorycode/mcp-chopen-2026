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
  info.textContent = `${tool.description}\nreadOnlyHint: ${tool.annotations?.readOnlyHint ?? false}\ninputSchema: ${JSON.stringify(tool.inputSchema)}`
  const props = Object.keys(tool.inputSchema?.properties ?? {})
  input.value = JSON.stringify(Object.fromEntries(props.map((p) => [p, ''])))
}

async function execute() {
  const tool = tools.find((t) => t.name === select.value)
  if (!tool) return
  try {
    // executeTool() liefert den serialisierten JSON-String (oder null bei Navigation).
    const raw = await document.modelContext.executeTool(tool, JSON.parse(input.value))
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
