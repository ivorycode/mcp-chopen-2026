// Ein Fetch-Proxy direkt zwischen Provider-Adapter und HTTP-Transport.
// Für generateText: Die Antwort wird vor der Rückgabe vollständig mitgelesen.
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

function bodyBlock(body: string): string {
  let language = 'text'
  try {
    body = JSON.stringify(JSON.parse(body), null, 2)
    language = 'json'
  } catch {
    // Auch Fehlertexte und SSE bleiben sichtbar, ohne das Format umzudeuten.
  }
  const fence = '`'.repeat(Math.max(3, ...Array.from(body.matchAll(/`+/g), ([match]) => match.length + 1)))
  return `${fence}${language}\n${body}\n${fence}`
}

export function createWireLogFetch({
  fetch: upstream = globalThis.fetch,
  logRoot = fileURLToPath(new URL('../logs/', import.meta.url)),
} = {}): typeof globalThis.fetch {
  let sequence = 0
  let directory: Promise<string> | undefined

  async function save(name: string, content: string): Promise<void> {
    directory ??= (async () => {
      await mkdir(logRoot, { recursive: true })
      const path = await mkdtemp(join(logRoot, `${new Date().toISOString().replaceAll(':', '-')}-`))
      console.log(`[Wire] Logs: ${path}`)
      return path
    })()
    await writeFile(join(await directory, name), content, { mode: 0o600 })
  }

  return async (input, init) => {
    const id = String(++sequence).padStart(2, '0')
    const request = new Request(input instanceof Request ? input.clone() : input, init)
    // Nur Origin und Pfad zeigen: Query-Parameter können API-Keys enthalten.
    // Auth-Header werden weitergeleitet, aber überhaupt nicht protokolliert.
    const url = new URL(request.url)
    const target = `${request.method} ${url.origin}${url.pathname}`
    let markdown = `# HTTP-Aufruf ${id}\n\n${target}\n\n## Request → Provider\n\n`
    const capture = async (operation: () => Promise<void>) => {
      try {
        await operation()
      } catch {
        // Ein Schreibfehler darf weder einen Provider-Aufruf wiederholen noch
        // eine erfolgreiche Antwort in einen SDK-Fehler verwandeln.
        console.warn(`[Wire ${id}] Log konnte nicht vollständig geschrieben werden.`)
      }
    }

    console.log(`[Wire ${id}] → ${target}`)
    await capture(async () => {
      const body = await request.clone().text()
      markdown += bodyBlock(body)
      await save(`${id}.request.txt`, body)
      await save(`${id}.md`, markdown)
    })

    let response: Response
    try {
      response = await upstream(input, init)
    } catch (error) {
      // Fehlermeldungen können URLs mit Credentials enthalten.
      await capture(() => save(`${id}.md`, `${markdown}\n\n## Transportfehler\n\nKeine HTTP-Antwort erhalten.\n`))
      console.log(`[Wire ${id}] ← Transportfehler`)
      throw error
    }

    await capture(async () => {
      const body = await response.clone().text()
      await save(`${id}.response.txt`, body)
      await save(`${id}.md`, `${markdown}\n\n## Response ← Provider (HTTP ${response.status})\n\n${bodyBlock(body)}\n`)
    })
    console.log(`[Wire ${id}] ← HTTP ${response.status} (${id}.md)`)
    return response
  }
}
