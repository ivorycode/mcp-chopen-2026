// Test-Client mit dem SDK v2, auf Spec 2026-07-28 festgelegt.
// Ausführen, während `npm run dev` läuft: `npm run client`
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const url = process.argv[2] ?? `http://localhost:${process.env.PORT ?? 3040}/mcp`

const client = new Client(
  { name: 'hello-mcp-client', version: '1.0.0' },
  {
    // Ohne `elicitation` im Capability-Set lehnt der Server MRTR-Rückfragen ab.
    capabilities: { elicitation: {} },
    // Default wäre 'legacy' (2025); der Server akzeptiert nur 2026-07-28.
    versionNegotiation: { mode: { pin: '2026-07-28' } },
  },
)

// Handler für Rückfragen (MRTR - Multi Round-Trip Requests): Der SDK-Client ruft ihn auf, wenn ein Tool
// `input_required` liefert, und wiederholt den Aufruf mit der Antwort.
client.setRequestHandler('elicitation/create', async (req) => {
  console.log(`[elicitation] ${req.params.message} -> accept { confirm: true }`)
  return { action: 'accept', content: { confirm: true } }
})

await client.connect(new StreamableHTTPClientTransport(new URL(url)))
console.log('Protokollversion:', client.getNegotiatedProtocolVersion())

const { tools } = await client.listTools()
console.log('Tools:', tools.map((t) => t.name).join(', '))

const add = await client.callTool({ name: 'add', arguments: { a: 2, b: 40 } })
console.log('add:', JSON.stringify(add.structuredContent))

const confirm = await client.callTool({ name: 'confirm-demo', arguments: { action: 'Licht einschalten' } })
console.log('confirm-demo:', JSON.stringify(confirm.structuredContent))

const about = await client.readResource({ uri: 'hello://about' })
console.log('hello://about:', about.contents[0] && 'text' in about.contents[0] ? about.contents[0].text : about.contents)

const prompt = await client.getPrompt({ name: 'greet', arguments: { name: 'Anna', language: 'Französisch' } })
console.log('greet:', JSON.stringify(prompt.messages[0]?.content))

await client.close()
