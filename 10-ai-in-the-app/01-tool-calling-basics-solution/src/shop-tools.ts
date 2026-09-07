// Die Webshop-Tools als Tools des Vercel AI SDK.
//
// Ein Tool besteht aus drei Teilen: Beschreibung (für das Modell), Eingabe-
// Schema (Zod – das Modell erzeugt Argumente, die dazu passen) und einer
// execute-Funktion (normaler Code). Beschreibung und Schema der drei ersten
// Tools kommen aus lokalen Shop-Core; die Ausführung delegiert an toolHandlers.
//
// Der Warenkorb-Handle (cartId) ist hier fix: Das Modell sieht ihn nie und
// kann ihn nicht verändern. Im Chatbot (02) kommt er aus der Session.
//
// Musterlösung: Das vierte Tool getArticleDetail ist ergänzt (siehe unten).

import { addToCartInput, emptyInput, searchProductsInput, toolDescriptions } from './core/contracts.ts'
import { getArticleDetail as fetchArticleDetail } from './core/catalog.ts'
import * as toolHandlers from './core/handlers.ts'
import { tool } from 'ai'
import { z } from 'zod'

export const CART_ID = 'cli-demo'

// --- Lösung Aufgabe 1: das vierte Tool ---------------------------------------
//
// Beschreibung, Schema und Handler bleiben bewusst hier in der Datei und wandern
// nicht nach core/: Der Shop-Core ist die unveränderte gemeinsame Grundlage
// aller Workshop-Stufen, das vierte Tool gehört nur zu dieser CLI-Übung.
//
// Die Beschreibung nennt ausdrücklich, woher die Artikelnummer kommt. Genau das
// verhindert erfundene Nummern: Das Modell sucht zuerst und liest dann das Detail.

export const articleDetailDescription =
  'Liefert Details zu einem Artikel: Bezeichnung, Zutaten, Allergene, Preis und Haltbarkeit. ' +
  'Die Artikelnummer stammt aus einem Treffer von searchProducts.'

export const getArticleDetailInput = z.object({
  articleNumber: z.string().trim().min(1).describe('Exakte Artikelnummer aus einem Suchresultat, z. B. "022600".'),
})

export type ArticleDetailResult =
  | { ok: false; error: string }
  | {
      ok: true
      articleNumber: string
      description: string
      price: number | null
      unitText: string | null
      ingredients: string | null
      durability: string | null
      /** Deklarationspflichtige Allergene ("enthält"). */
      allergens: Array<string>
      /** Spuren ("kann enthalten"). */
      mayContain: Array<string>
    }

/**
 * Handler des vierten Tools. Er liefert Fehler als Wert (`ok: false`) statt sie
 * zu werfen – dieselbe Regel wie in core/handlers.ts: Das Modell soll einen
 * Fehler lesen und darauf reagieren können (z. B. nochmals suchen).
 *
 * Zurückgegeben wird nur, was für eine Antwort gebraucht wird. Das vollständige
 * Detail-Objekt der Katalog-API hat gut zwanzig Felder und würde die Antwort
 * unnötig mit Tokens fluten.
 */
export async function articleDetail(input: { articleNumber: string }): Promise<ArticleDetailResult> {
  try {
    const article = await fetchArticleDetail(input.articleNumber)
    return {
      ok: true,
      articleNumber: article.articleNumber,
      description: article.description,
      price: article.price,
      unitText: article.unitText,
      ingredients: article.ingredients,
      durability: article.durability,
      allergens: article.allergenContains.map((fact) => fact.text),
      mayContain: article.allergenMayContains.map((fact) => fact.text),
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Die Artikeldetails konnten nicht geladen werden.',
    }
  }
}

// -----------------------------------------------------------------------------

export const shopTools = {
  searchProducts: tool({
    description: toolDescriptions.searchProducts,
    inputSchema: searchProductsInput,
    execute: (input) => toolHandlers.searchProducts(input),
  }),
  getArticleDetail: tool({
    description: articleDetailDescription,
    inputSchema: getArticleDetailInput,
    execute: (input) => articleDetail(input),
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
Verwende für Produktsuche, Artikeldetails und Warenkorb ausschliesslich die Tools. Erfinde keine Artikelnummern.
Für Zutaten, Allergene und Haltbarkeit zuerst suchen und dann getArticleDetail aufrufen.
Antworte kurz auf Deutsch.`

export const DEFAULT_PROMPT =
  'Finde Vollmilch und lege zwei Stück in den Warenkorb. Zeig mir danach den Warenkorb.'

/** Kürzt ein Tool-Resultat für das Log. */
export function short(value: unknown, max = 160): string {
  const text = JSON.stringify(value)
  return text.length > max ? `${text.slice(0, max)}…` : text
}
