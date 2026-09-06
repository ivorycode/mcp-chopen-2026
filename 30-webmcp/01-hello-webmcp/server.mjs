// Minimaler statischer HTTP-Server für die Demo (kein Build, keine Abhängigkeiten).
// http://localhost ist ein "secure context", damit ist document.modelContext verfügbar.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const PORT = Number(process.env.PORT ?? 3050)
const ROOT = new URL('./public/', import.meta.url).pathname
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}

createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname
  const file = join(ROOT, path === '/' ? 'index.html' : path)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('Not found')
  }
}).listen(PORT, () => console.log(`Hello WebMCP: http://localhost:${PORT}`))
