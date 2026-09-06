// Hello MCP: ein minimaler Server nach Spec 2026-07-28.
//
// Der Server ist zustandslos: Die Factory `buildServer` wird pro Request neu
// aufgerufen (HTTP) bzw. einmal pro Prozess (stdio). Alles, was ein Client
// wissen muss, steht in den Antworten; es gibt keine Session.

import { McpServer, inputRequired, acceptedContent, inputResponse } from '@modelcontextprotocol/server'
import { z } from 'zod'

export function buildServer(): McpServer {
  const server = new McpServer({ name: 'hello-mcp', version: '1.0.0' })

  // 1. Tool mit Eingabe- und Ausgabe-Schema. Das Resultat ist dual:
  //    `content` (Text) für das Modell, `structuredContent` für Code und UI.
  server.registerTool(
    'add',
    {
      title: 'Addieren',
      description: 'Addiert zwei Zahlen und liefert die Summe.',
      inputSchema: z.object({
        a: z.number().describe('Erster Summand'),
        b: z.number().describe('Zweiter Summand'),
      }),
      outputSchema: z.object({ sum: z.number() }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ a, b }) => {
      const sum = a + b
      return {
        content: [{ type: 'text', text: JSON.stringify({ sum }) }],
        structuredContent: { sum },
      }
    },
  )

  // 2. Tool mit Multi-Round-Trip-Request (MRTR): Der Server braucht eine
  //    Rückfrage an die Benutzerin oder den Benutzer. Statt eine Anfrage an
  //    den Client zu schicken (Elicitation, 2025), liefert er ein Resultat mit
  //    `resultType: "input_required"`. Der Client holt die Eingabe ein und
  //    ruft das Tool erneut auf, diesmal mit `inputResponses`.
  server.registerTool(
    'confirm-demo',
    {
      title: 'Bestätigung (MRTR-Demo)',
      description: 'Führt eine Aktion nur nach Rückfrage aus. Demonstriert Multi-Round-Trip-Requests.',
      inputSchema: z.object({ action: z.string().describe('Beschreibung der auszuführenden Aktion') }),
      outputSchema: z.object({ executed: z.boolean(), action: z.string() }),
    },
    async ({ action }, ctx) => {
      const answer = acceptedContent(ctx.mcpReq.inputResponses, 'confirm', z.object({ confirm: z.boolean() }))

      if (!answer) {
        // Runde 1 (oder Antwort abgelehnt/abgebrochen): unterscheiden
        const view = inputResponse(ctx.mcpReq.inputResponses, 'confirm')
        if (view.kind === 'elicit' && view.action !== 'accept') {
          return {
            content: [{ type: 'text', text: JSON.stringify({ executed: false, action }) }],
            structuredContent: { executed: false, action },
          }
        }
        return inputRequired({
          inputRequests: {
            confirm: inputRequired.elicit({
              message: `Aktion "${action}" wirklich ausführen?`,
              requestedSchema: z.object({ confirm: z.boolean().describe('Aktion ausführen') }),
            }),
          },
        })
      }

      // Runde 2: Antwort liegt vor
      const result = { executed: answer.confirm, action }
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      }
    },
  )

  // 3. Resource: statischer Inhalt unter einer URI
  server.registerResource(
    'about',
    'hello://about',
    { title: 'Über diesen Server', description: 'Kurzbeschreibung des Hello-MCP-Servers', mimeType: 'text/plain' },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: 'Hello MCP: minimaler Server nach MCP-Spezifikation 2026-07-28 (stateless, Streamable HTTP und stdio).',
        },
      ],
    }),
  )

  // 4. Prompt: eine parametrisierte Vorlage, die der Host der Benutzerin
  //    oder dem Benutzer anbietet (z. B. als Slash-Command).
  server.registerPrompt(
    'greet',
    {
      title: 'Begrüssung',
      description: 'Erzeugt eine Begrüssung in einer bestimmten Sprache.',
      argsSchema: z.object({
        name: z.string().describe('Name der Person'),
        language: z.string().optional().describe('Sprache, Standard: Deutsch'),
      }),
    },
    ({ name, language }) => ({
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: `Begrüsse ${name} freundlich auf ${language ?? 'Deutsch'}.` },
        },
      ],
    }),
  )

  return server
}
