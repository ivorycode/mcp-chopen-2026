// Tool-Contracts: Name, Beschreibung und Eingabe-Schema der Webshop-Tools.
//
// Diese Contracts sind der gemeinsame Nenner aller drei Workshop-Teile:
// - Teil 1 registriert sie als Tools im AI SDK (Chatbot in der App)
// - Teil 2 registriert sie als MCP-Tools (App im KI-Assistenten)
// - Teil 3 registriert sie als WebMCP-Tools im Browser (Agent-gesteuerte App)
//
// Die Beschreibungen sind für das Sprachmodell bestimmt: Sie sind das
// "User Interface" des Tools gegenüber dem Modell.

import { z } from 'zod'

export const searchProductsInput = z.object({
  term: z.string().trim().min(1).describe('Suchbegriff für Produkte im Katalog, z. B. "Milch" oder "Basmati".'),
})

export const addToCartInput = z.object({
  articleNumber: z.string().trim().min(1).describe('Exakte Artikelnummer aus einem Suchresultat.'),
  quantity: z.number().int().min(1).max(99).default(1).describe('Anzahl Verkaufseinheiten. Standard: 1.'),
})

export const removeFromCartInput = z.object({
  articleNumber: z.string().trim().min(1).describe('Artikelnummer der zu entfernenden Position.'),
})

export const emptyInput = z.object({})

/**
 * Erweitert ein Eingabe-Schema um den Warenkorb-Handle. Wird dort gebraucht,
 * wo kein Session-Kontext existiert (MCP): Das Modell gibt den Handle mit.
 */
export function withCartId<T extends z.ZodRawShape>(shape: T) {
  return z.object({
    cartId: z.string().min(1).describe('Handle des Warenkorbs, wie von createCart zurückgegeben.'),
    ...shape,
  })
}

export const toolDescriptions = {
  searchProducts: 'Sucht Produkte im Webshop-Katalog zu einem Suchbegriff und liefert die besten Treffer mit Artikelnummer und Preis.',
  getCart: 'Liefert den aktuellen Inhalt des Warenkorbs mit Positionen, Mengen und Gesamtbetrag.',
  addToCart: 'Legt einen Artikel anhand seiner Artikelnummer in den Warenkorb.',
  removeFromCart: 'Entfernt eine Position anhand ihrer Artikelnummer aus dem Warenkorb.',
  checkout: 'Schliesst die Bestellung ab: Der Warenkorb wird als Bestellung abgeschickt und geleert. Nur nach ausdrücklicher Bestätigung durch die Benutzerin oder den Benutzer aufrufen.',
  createCart: 'Erzeugt einen neuen, leeren Warenkorb und liefert seinen Handle (cartId) zurück. Der Handle wird bei allen weiteren Warenkorb-Tools mitgegeben.',
} as const

export type ToolName = keyof typeof toolDescriptions

/** JSON Schema (Draft 2020-12) eines Zod-Schemas, z. B. für WebMCP `registerTool`. */
export function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  return z.toJSONSchema(schema) as Record<string, unknown>
}
