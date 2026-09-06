// MCP-Server des Webshops: Dieselben Contracts wie Chat, ergänzt um
// die loginId. Ein externer Agent nennt das Demo-Konto ausdrücklich.

import { McpServer } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { DEMO_ACCOUNTS, findAccount } from '../../lib/accounts.ts'
import * as shop from '../../lib/shop.server.ts'
import {
  addToCartInput,
  emptyInput,
  removeFromCartInput,
  searchProductsInput,
  toolDescriptions,
} from '../../lib/tools/contracts.ts'
import { toolHandlers } from '../../lib/tools/handlers.server.ts'
import type { CartResult } from '../../lib/tools/results.ts'

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

/** Warenkorb-Daten für externe Agenten: Resultat plus Konto und Bestellverlauf. */
function cartPayload<T extends CartResult>(loginId: string, data: T) {
  return { ...data, loginId, orders: shop.getOrders(loginId) }
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
    async ({ term, loginId }) => {
      if (loginId && !findAccount(loginId)) return invalidLogin(loginId)
      const data = await toolHandlers.searchProducts({ term })
      return toolResult(
        { ...data, loginId: loginId ?? null },
        data.ok
          ? `${data.shownCount} Produkte für "${data.searchTerm}" gefunden.`
          : data.error,
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
    withAccount((loginId) => {
      const data = cartPayload(loginId, toolHandlers.getCart(loginId))
      return toolResult(
        data,
        data.totalItems
          ? `Warenkorb enthält ${data.totalItems} Artikel.`
          : 'Der Warenkorb ist leer.',
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
    withAccount(async (loginId, { articleNumber, quantity }) => {
      const data = await toolHandlers.addToCart(loginId, {
        articleNumber,
        quantity,
      })
      return toolResult(
        cartPayload(loginId, data),
        data.ok ? `Artikel ${articleNumber} hinzugefügt.` : data.error,
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
    withAccount((loginId, { articleNumber }) => {
      const data = toolHandlers.removeFromCart(loginId, { articleNumber })
      return toolResult(
        cartPayload(loginId, data),
        data.ok ? `Artikel ${articleNumber} entfernt.` : data.error,
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
    withAccount((loginId) => {
      const data = toolHandlers.checkout(loginId)
      if (!data.ok) return toolResult(cartPayload(loginId, data), data.error)
      // Nach dem Checkout zeigt der Agent den (leeren) Warenkorb und
      // die Bestätigung; dafür liefert das Resultat beides.
      const cart = cartPayload(loginId, toolHandlers.getCart(loginId))
      return toolResult(
        { ...data, loginId, cart },
        `Bestellung ${data.orderId} übermittelt.`,
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
    withAccount((loginId) => {
      const data = cartPayload(loginId, toolHandlers.getCart(loginId))
      return toolResult(data, `${data.orders.length} Bestellungen gefunden.`)
    }),
  )

  return server
}
