// In-Memory-Warenkorb, adressiert über einen expliziten Handle (cartId).
//
// Der Handle ist das zentrale Pattern des Workshops: Ein Client (Browser-Session,
// Chatbot, MCP-Host) erhält einen cartId-Wert und gibt ihn bei jedem weiteren
// Aufruf mit. Der Server muss sich keine Verbindung oder Session merken.

import { randomUUID } from 'node:crypto'
import type { ArticleDetail, CartItem, CartState, CheckoutResult } from './types.ts'

const carts = new Map<string, Array<CartItem>>()
let orderSequence = 1000

function round(amount: number): number {
  return Math.round(amount * 100) / 100
}

function summarize(cartId: string, items: Array<CartItem>): CartState {
  return {
    cartId,
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: round(items.reduce((sum, item) => sum + item.price * item.quantity, 0)),
  }
}

function toCartItem(article: ArticleDetail, quantity: number): CartItem {
  return {
    articleNumber: article.articleNumber,
    celumId: article.celumId,
    description: article.description,
    unitText: article.unitText,
    price: article.price ?? 0,
    quantity,
    sellAmount: article.sellAmount,
    sellUnit: article.sellUnit,
  }
}

/** Erzeugt einen neuen, leeren Warenkorb und gibt seinen Handle zurück. */
export function createCart(cartId: string = `cart_${randomUUID().slice(0, 8)}`): CartState {
  if (!carts.has(cartId)) carts.set(cartId, [])
  return summarize(cartId, carts.get(cartId)!)
}

export function cartExists(cartId: string): boolean {
  return carts.has(cartId)
}

/** Liefert den Warenkorb; ein unbekannter Handle ergibt einen leeren Warenkorb. */
export function getCart(cartId: string): CartState {
  return summarize(cartId, carts.get(cartId) ?? [])
}

export function addToCart(cartId: string, article: ArticleDetail, quantity: number): CartState {
  const items = [...(carts.get(cartId) ?? [])]
  const index = items.findIndex((item) => item.articleNumber === article.articleNumber)
  if (index >= 0) {
    items[index] = { ...items[index], quantity: items[index].quantity + quantity }
  } else {
    items.push(toCartItem(article, quantity))
  }
  carts.set(cartId, items)
  return summarize(cartId, items)
}

export function updateCartQuantity(cartId: string, articleNumber: string, quantity: number): CartState {
  const items = (carts.get(cartId) ?? [])
    .map((item) => (item.articleNumber === articleNumber ? { ...item, quantity } : item))
    .filter((item) => item.quantity > 0)
  carts.set(cartId, items)
  return summarize(cartId, items)
}

export function removeFromCart(cartId: string, articleNumber: string): CartState {
  const items = (carts.get(cartId) ?? []).filter((item) => item.articleNumber !== articleNumber)
  carts.set(cartId, items)
  return summarize(cartId, items)
}

export function clearCart(cartId: string): CartState {
  carts.set(cartId, [])
  return summarize(cartId, [])
}

export function checkoutCart(cartId: string): CheckoutResult {
  const cart = getCart(cartId)
  if (!cart.items.length) {
    throw new Error('Der Warenkorb ist leer.')
  }
  orderSequence += 1
  carts.set(cartId, [])
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return {
    cartId,
    orderNumber: `TGD-${date}-${orderSequence}`,
    submittedAt: new Date().toISOString(),
    totalItems: cart.totalItems,
    totalAmount: cart.totalAmount,
  }
}
