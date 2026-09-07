// Resultat-Typen der Tools. Bewusst klein gehalten: Das Modell bekommt nur,
// was es für die Antwort braucht (Token-Effizienz), die UI bekommt, was sie
// zum Rendern braucht (celumId für Bilder).

export type ToolError = {
  ok: false
  error: string
}

export type SearchProductItem = {
  articleNumber: string
  celumId: string | null
  description: string
  brand: string | null
  price: number | null
  unitText: string | null
  sellAmount: number | null
  sellUnit: string | null
}

export type SearchProductsResult =
  | ToolError
  | {
      ok: true
      searchTerm: string
      totalCount: number
      shownCount: number
      articles: Array<SearchProductItem>
    }

export type CartLine = {
  articleNumber: string
  celumId: string | null
  description: string
  price: number
  quantity: number
  lineTotal: number
  sellAmount: number | null
  sellUnit: string | null
}

export type CartResult =
  | ToolError
  | {
      ok: true
      cartId: string
      items: Array<CartLine>
      totalItems: number
      totalAmount: number
      message?: string
    }

export type CheckoutToolResult =
  | ToolError
  | {
      ok: true
      cartId: string
      orderNumber: string
      submittedAt: string
      totalItems: number
      totalAmount: number
    }
