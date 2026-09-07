// Die Webshop-Tools als Tools des Vercel AI SDK, gebunden an die Session.
//
// Beschreibung und Eingabe-Schema kommen aus den gemeinsamen Contracts. Die
// loginId kommt aus dem Session-Cookie des angemeldeten Kontos, niemals vom
// Modell: Das Modell kann keinen fremden Warenkorb adressieren.

import { tool } from 'ai'
import type { InferUITools, UIDataTypes, UIMessage } from 'ai'
import {
  addToCartInput,
  emptyInput,
  removeFromCartInput,
  searchProductsInput,
  toolDescriptions,
} from '../../../lib/tools/contracts.ts'
import { toolHandlers } from '../../../lib/tools/handlers.server.ts'
import type {
  CartResult,
  CheckoutToolResult,
  ToolError,
} from '../../../lib/tools/results.ts'
import { getCurrentAccount } from '../../../lib/session.server.ts'

const NOT_IMPLEMENTED: ToolError = {
  ok: false,
  error: 'Noch nicht implementiert – siehe EXERCISE.md.',
}

const LOGIN_REQUIRED: ToolError = {
  ok: false,
  error:
    'Bitte zuerst ein Demo-Konto auswählen, um den Warenkorb zu verwenden.',
}

/** Bindet einen Handler an das Konto der aktuellen Browser-Session. */
function forSession<TInput, TResult>(
  run: (loginId: string, input: TInput) => TResult,
) {
  return (input: TInput): TResult | ToolError => {
    const account = getCurrentAccount()
    return account ? run(account.loginId, input) : LOGIN_REQUIRED
  }
}

export const shopTools = {
  searchProducts: tool({
    description: toolDescriptions.searchProducts,
    inputSchema: searchProductsInput,
    execute: (input) => toolHandlers.searchProducts(input),
  }),

  getCart: tool({
    description: toolDescriptions.getCart,
    inputSchema: emptyInput,
    execute: forSession((_loginId): CartResult => {
      // TODO Schritt 1: toolHandlers.getCart(loginId)
      return NOT_IMPLEMENTED
    }),
  }),

  addToCart: tool({
    description: toolDescriptions.addToCart,
    inputSchema: addToCartInput,
    execute: forSession((_loginId, _input): CartResult => {
      // TODO Schritt 2: toolHandlers.addToCart(loginId, input), async und Promise<CartResult>
      return NOT_IMPLEMENTED
    }),
  }),

  removeFromCart: tool({
    description: toolDescriptions.removeFromCart,
    inputSchema: removeFromCartInput,
    execute: forSession((_loginId, _input): CartResult => {
      // TODO Schritt 3: toolHandlers.removeFromCart(loginId, input)
      return NOT_IMPLEMENTED
    }),
  }),

  // checkout hat Seiteneffekte: Die Freigabe erfolgt in chat-route.server.ts
  // über toolApproval (Human-in-the-loop), nicht im Tool selbst.
  checkout: tool({
    description: toolDescriptions.checkout,
    inputSchema: emptyInput,
    execute: forSession((_loginId): CheckoutToolResult => {
      // TODO Schritt 5: toolHandlers.checkout(loginId)
      return NOT_IMPLEMENTED
    }),
  }),
}

/** UI-Nachricht mit typisierten Tool-Parts (tool-searchProducts, tool-getCart, ...). */
export type ShopUIMessage = UIMessage<
  never,
  UIDataTypes,
  InferUITools<typeof shopTools>
>
