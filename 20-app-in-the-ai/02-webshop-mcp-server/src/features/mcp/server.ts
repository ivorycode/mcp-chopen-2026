// MCP-Server des Webshops: Dieselben Contracts wie Chat, ergänzt um
// die loginId. Ein externer Agent nennt das Demo-Konto ausdrücklich.

import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { DEMO_ACCOUNTS, findAccount } from '../../lib/accounts.ts'
import {
  addToCartInput,
  emptyInput,
  removeFromCartInput,
  searchProductsInput,
  toolDescriptions,
} from '../../lib/tools/contracts.ts'

const loginIdInput = z
  .string()
  .trim()
  .min(1)
  .describe(
    `Login-ID eines Demo-Kontos: ${DEMO_ACCOUNTS.map((a) => a.loginId).join(', ')}.`,
  )

const withLoginId = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({ loginId: loginIdInput })

type ToolData = Record<string, unknown> & { ok: boolean }

/** MCP-Resultat: Text für das Modell, strukturierte Daten für den Host. */
function toolResult(data: ToolData, text: string) {
  return {
    content: [{ type: 'text' as const, text }],
    structuredContent: data,
    ...(data.ok ? {} : { isError: true }),
  }
}

function invalidLogin(loginId: string) {
  const validAccounts = DEMO_ACCOUNTS.map((account) => account.loginId)
  return toolResult(
    {
      ok: false,
      error: `Unbekannte Login-ID "${loginId}".`,
      validAccounts: DEMO_ACCOUNTS,
    },
    `Unbekanntes Demo-Konto. Gültig sind: ${validAccounts.join(', ')}.`,
  )
}

/** Prüft die loginId und reicht sie an den Handler weiter. */
function withAccount<TInput extends { loginId: string }>(
  run: (
    loginId: string,
    input: TInput,
  ) => ReturnType<typeof toolResult> | Promise<ReturnType<typeof toolResult>>,
) {
  return (input: TInput) => {
    const account = findAccount(input.loginId)
    return account ? run(account.loginId, input) : invalidLogin(input.loginId)
  }
}

export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: 'webshop-mcp-server', version: '3.0.0' })

  server.registerTool(
    'searchProducts',
    {
      title: 'Produkte suchen',
      description: toolDescriptions.searchProducts,
      inputSchema: searchProductsInput.extend({
        loginId: loginIdInput.optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async ({ loginId }) => {
      if (loginId && !findAccount(loginId)) return invalidLogin(loginId)
      // TODO Schritt 2: searchProducts mit toolHandlers verbinden; term übernehmen.
      return toolResult(
        { ok: false, error: 'Noch nicht implementiert.' },
        'Siehe EXERCISE.md.',
      )
    },
  )

  server.registerTool(
    'getCart',
    {
      title: 'Warenkorb anzeigen',
      description: toolDescriptions.getCart,
      inputSchema: withLoginId(emptyInput),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    withAccount((_loginId) => {
      // TODO Schritte 3–4: getCart implementieren; Konto und Resultatformat erhalten.
      return toolResult(
        { ok: false, error: 'Noch nicht implementiert.' },
        'Siehe EXERCISE.md.',
      )
    }),
  )

  server.registerTool(
    'addToCart',
    {
      title: 'Zum Warenkorb hinzufügen',
      description: toolDescriptions.addToCart,
      inputSchema: withLoginId(addToCartInput),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    withAccount((_loginId) => {
      // TODO Schritte 3–4: addToCart implementieren; Konto und Resultatformat erhalten.
      return toolResult(
        { ok: false, error: 'Noch nicht implementiert.' },
        'Siehe EXERCISE.md.',
      )
    }),
  )

  server.registerTool(
    'removeFromCart',
    {
      title: 'Aus dem Warenkorb entfernen',
      description: toolDescriptions.removeFromCart,
      inputSchema: withLoginId(removeFromCartInput),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
      },
    },
    withAccount((_loginId) => {
      // TODO Schritte 3–4: removeFromCart implementieren; Konto und Resultatformat erhalten.
      return toolResult(
        { ok: false, error: 'Noch nicht implementiert.' },
        'Siehe EXERCISE.md.',
      )
    }),
  )

  server.registerTool(
    'checkout',
    {
      title: 'Bestellung abschliessen',
      description: toolDescriptions.checkout,
      inputSchema: withLoginId(emptyInput),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withAccount((_loginId) => {
      // TODO Schritte 3–4: checkout implementieren; Konto und Resultatformat erhalten.
      return toolResult(
        { ok: false, error: 'Noch nicht implementiert.' },
        'Siehe EXERCISE.md.',
      )
    }),
  )

  server.registerTool(
    'getOrders',
    {
      title: 'Bestellungen anzeigen',
      description: 'Zeigt die letzten Bestellungen des Demo-Kontos.',
      inputSchema: withLoginId(emptyInput),
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    withAccount((_loginId) => {
      // TODO Schritte 3–4: getOrders implementieren; Konto und Resultatformat erhalten.
      return toolResult(
        { ok: false, error: 'Noch nicht implementiert.' },
        'Siehe EXERCISE.md.',
      )
    }),
  )

  return server
}
