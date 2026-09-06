// stdio-Transport: Der Host startet diesen Prozess selbst und spricht über
// stdin/stdout JSON-RPC. stdout ist der Protokollkanal, Logs gehören auf stderr.
import './env.ts'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { buildServer } from './server.ts'

serveStdio(buildServer)
console.error('hello-mcp (stdio, MCP 2026-07-28) gestartet')
