// Tool-Definitionen (isomorph): Name, Beschreibung, Eingabe- und Ausgabeschema.
//
// TanStack AI trennt die Definition eines Tools von seiner Implementierung.
// Die Definition wird auf dem Server (Modell sieht sie, `.server()` führt sie
// aus) und im Browser (typisierte Message-Parts in `useChat`) importiert.
// Beschreibungen und Eingabeschemas kommen unverändert aus lib/tools/contracts.ts.

import { toolDefinition } from '@tanstack/ai'
import {
  addToCartInput,
  emptyInput,
  removeFromCartInput,
  searchProductsInput,
  toolDescriptions,
} from '../../../lib/tools/contracts.ts'
import type {
  CartResult,
  CheckoutToolResult,
  SearchProductsResult,
} from '../../../lib/tools/results.ts'

export const searchProductsDef = toolDefinition({
  name: 'searchProducts',
  description: toolDescriptions.searchProducts,
  inputSchema: searchProductsInput,
})

export const getCartDef = toolDefinition({
  name: 'getCart',
  description: toolDescriptions.getCart,
  inputSchema: emptyInput,
})

export const addToCartDef = toolDefinition({
  name: 'addToCart',
  description: toolDescriptions.addToCart,
  inputSchema: addToCartInput,
})

export const removeFromCartDef = toolDefinition({
  name: 'removeFromCart',
  description: toolDescriptions.removeFromCart,
  inputSchema: removeFromCartInput,
})

// Human-in-the-loop: `needsApproval` gehört zur Definition. Der Stream hält
// vor der Ausführung an und liefert einen Interrupt, den die UI auflöst.
export const checkoutDef = toolDefinition({
  name: 'checkout',
  description: toolDescriptions.checkout,
  inputSchema: emptyInput,
  // TODO (Schritt 6): Checkout-Bestätigung mit needsApproval aktivieren.
})

export const toolDefinitions = [
  searchProductsDef,
  getCartDef,
  addToCartDef,
  removeFromCartDef,
  checkoutDef,
]

/** Ausgabetypen der Tools, für das Rendern der Resultate im Widget. */
export type ToolOutputs = {
  searchProducts: SearchProductsResult
  getCart: CartResult
  addToCart: CartResult
  removeFromCart: CartResult
  checkout: CheckoutToolResult
}

export { chatStarterPrompts } from './chat-config.ts'
