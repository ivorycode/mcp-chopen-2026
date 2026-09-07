// Framework-neutrale Implementierung der Tools.
//
// Jede Funktion nimmt die Tool-Eingabe entgegen und liefert ein Resultat-
// Objekt mit `ok: true | false`. Fehler werden als Wert zurückgegeben, nicht
// geworfen: Das Modell soll einen Fehler lesen und darauf reagieren können.
//
// Der Warenkorb-Handle (cartId) wird als separater Parameter übergeben. Woher
// er kommt, entscheidet die aufrufende Schicht: Session-Cookie (Webshop),
// Tool-Argument (MCP) oder Seiten-Zustand (WebMCP).

import * as cart from './cart.ts'
import { getArticleDetail, searchArticles } from './catalog.ts'
import type { CartState } from './types.ts'
import type { CartResult, CheckoutToolResult, SearchProductsResult } from './results.ts'

export const MAX_SEARCH_RESULTS = 5

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function toCartResult(state: CartState, message?: string): CartResult {
  return {
    ok: true,
    cartId: state.cartId,
    items: state.items.map((item) => ({
      articleNumber: item.articleNumber,
      celumId: item.celumId,
      description: item.description,
      price: item.price,
      quantity: item.quantity,
      lineTotal: Math.round(item.price * item.quantity * 100) / 100,
      sellAmount: item.sellAmount,
      sellUnit: item.sellUnit,
    })),
    totalItems: state.totalItems,
    totalAmount: state.totalAmount,
    ...(message ? { message } : {}),
  }
}

export async function searchProducts(input: { term: string }): Promise<SearchProductsResult> {
  const term = input.term.trim()
  if (!term) return { ok: false, error: 'Der Suchbegriff darf nicht leer sein.' }

  try {
    const result = await searchArticles(term)
    const articles = result.articles.slice(0, MAX_SEARCH_RESULTS).map((article) => ({
      articleNumber: article.articleNumber,
      celumId: article.celumId,
      description: article.description,
      brand: article.brand,
      price: article.price,
      unitText: article.unitText,
      sellAmount: article.sellAmount,
      sellUnit: article.sellUnit,
    }))
    return {
      ok: true,
      searchTerm: result.searchTerm,
      totalCount: result.totalCount,
      shownCount: articles.length,
      articles,
    }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Die Produktsuche ist fehlgeschlagen.') }
  }
}

export function createCart(): CartResult {
  return toCartResult(cart.createCart(), 'Neuer Warenkorb erzeugt.')
}

export function getCart(cartId: string): CartResult {
  return toCartResult(cart.getCart(cartId))
}

export async function addToCart(
  cartId: string,
  input: { articleNumber: string; quantity?: number },
): Promise<CartResult> {
  const quantity = input.quantity ?? 1
  try {
    const article = await getArticleDetail(input.articleNumber)
    const state = cart.addToCart(cartId, article, quantity)
    return toCartResult(state, `${quantity} × ${article.description} wurde in den Warenkorb gelegt.`)
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Der Artikel konnte nicht hinzugefügt werden.') }
  }
}

export function removeFromCart(cartId: string, input: { articleNumber: string }): CartResult {
  const before = cart.getCart(cartId)
  if (!before.items.some((item) => item.articleNumber === input.articleNumber)) {
    return { ok: false, error: `Artikel ${input.articleNumber} ist nicht im Warenkorb.` }
  }
  return toCartResult(cart.removeFromCart(cartId, input.articleNumber), `Artikel ${input.articleNumber} entfernt.`)
}

export function checkout(cartId: string): CheckoutToolResult {
  try {
    const result = cart.checkoutCart(cartId)
    return { ok: true, ...result }
  } catch (error) {
    return { ok: false, error: errorMessage(error, 'Die Bestellung konnte nicht abgeschlossen werden.') }
  }
}
