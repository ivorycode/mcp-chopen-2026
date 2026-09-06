// WebMCP: Die Webshop-Tools als native Browser-Tools der geöffneten Seite.
//
// Dieselben Contracts wie Chat und MCP; ausgeführt werden sie aber im Browser
// über die Web-API und damit mit der Session des sichtbaren Demo-Kontos.
// Nach jedem Aufruf informiert ein Shop-Event die Oberfläche, damit Suche,
// Warenkorb und Bestellungen ohne Reload nachziehen.

import type { z } from 'zod'
import { ApiRequestError } from '../../lib/client-api.ts'
import { toJsonSchema, toolDescriptions } from '../../lib/tools/contracts.ts'
import type { ToolName } from '../../lib/tools/contracts.ts'
import type { ToolError } from '../../lib/tools/results.ts'

function toToolError(error: unknown): ToolError {
  if (error instanceof ApiRequestError && error.status === 401) {
    return {
      ok: false,
      error:
        'Nicht angemeldet. Zuerst eines der drei Demo-Konten im Webshop auswählen.',
    }
  }
  return {
    ok: false,
    error:
      error instanceof Error
        ? error.message
        : 'Die Tool-Ausführung ist fehlgeschlagen.',
  }
}

/** Baut ein WebMCP-Tool aus Contract, Annotationen und Ausführung. */
export function defineTool<TSchema extends z.ZodObject>(
  name: ToolName,
  schema: TSchema,
  annotations: WebMCPToolAnnotations,
  run: (input: z.infer<TSchema>) => Promise<unknown>,
): WebMCPModelContextTool {
  return {
    name,
    description: toolDescriptions[name],
    inputSchema: toJsonSchema(schema),
    annotations,
    async execute(input) {
      const parsed = schema.safeParse(input)
      if (!parsed.success) {
        return {
          ok: false,
          error: `Ungültige Eingabe: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
        }
      }
      try {
        return await run(parsed.data)
      } catch (error) {
        return toToolError(error)
      }
    },
  }
}

export const shopTools: Array<WebMCPModelContextTool> = [
  // TODO Schritte 1–4: defineTool für searchProducts, getCart, addToCart,
  // removeFromCart und checkout. Web-API aufrufen, Resultate und Shop-Events liefern.
]

export function registerShopTools(
  _modelContext: WebMCPModelContext,
): () => void {
  // TODO Schritt 5: Tools mit gemeinsamem AbortController registrieren;
  // Cleanup muss alle Registrierungen abbrechen. AbortError beim Unmount ignorieren.
  return () => {}
}
