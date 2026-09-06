// Streamable HTTP auf /mcp. Der SDK-Standardmodus handelt sowohl die aktuelle
// Spezifikation als auch die vom SDK unterstützten älteren Versionen aus.
import './env.ts'
import { createMcpExpressApp } from '@modelcontextprotocol/express'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { createMcpHandler } from '@modelcontextprotocol/server'
import { buildServer } from './server.ts'

const PORT = Number(process.env.PORT ?? 3040)

const handler = createMcpHandler(buildServer)
const app = createMcpExpressApp()
const node = toNodeHandler(handler)

app.all('/mcp', (req, res) => void node(req, res, req.body))

app.listen(PORT, () => {
  console.log(`hello-mcp (MCP 2026-07-28) auf http://localhost:${PORT}/mcp`)
})
