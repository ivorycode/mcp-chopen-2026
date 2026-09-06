// Die Webshop-Tools als Tools des Vercel AI SDK.
//
// Ein Tool besteht aus drei Teilen: Beschreibung (für das Modell), Eingabe-
// Schema (Zod – das Modell erzeugt Argumente, die dazu passen) und einer
// execute-Funktion (normaler Code). Beschreibung und Schema kommen aus
// lokalen Shop-Core; die Ausführung delegiert an toolHandlers.
//
// Der Warenkorb-Handle (cartId) ist hier fix: Das Modell sieht ihn nie und
// kann ihn nicht verändern. Im Chatbot (02) kommt er aus der Session.

import { addToCartInput, emptyInput, searchProductsInput, toolDescriptions } from './core/contracts.ts'
import * as toolHandlers from './core/handlers.ts'
import { tool } from 'ai'

export const CART_ID = 'cli-demo'

export const shopTools = {
  searchProducts: tool({
    description: toolDescriptions.searchProducts,
    inputSchema: searchProductsInput,
    execute: (input) => toolHandlers.searchProducts(input),
  }),
  getCart: tool({
    description: toolDescriptions.getCart,
    inputSchema: emptyInput,
    execute: () => toolHandlers.getCart(CART_ID),
  }),
  addToCart: tool({
    description: toolDescriptions.addToCart,
    inputSchema: addToCartInput,
    execute: (input) => toolHandlers.addToCart(CART_ID, input),
  }),
}

export const instructions = `Du bist ein Einkaufsassistent für einen Lebensmittel-Grosshandel.
Verwende für Produktsuche und Warenkorb ausschliesslich die Tools. Erfinde keine Artikelnummern.
Antworte kurz auf Deutsch.`

export const DEFAULT_PROMPT =
  'Finde Vollmilch und lege zwei Stück in den Warenkorb. Zeig mir danach den Warenkorb.'

/** Kürzt ein Tool-Resultat für das Log. */
export function short(value: unknown, max = 160): string {
  const text = JSON.stringify(value)
  return text.length > max ? `${text.slice(0, max)}…` : text
}
