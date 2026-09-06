// Domain-Typen des Webshops. Unabhängig von Framework, Transport und KI-SDK.

export type ApiIcon = {
  id: string
  imgSrc: string
  title: string | null
}

export type SearchArticle = {
  articleNumber: string
  celumId: string | null
  icons: Array<ApiIcon>
  description: string
  brand: string | null
  unitText: string | null
  price: number | null
  oldPrice: number | null
  sellAmount: number | null
  sellUnit: string | null
  status: string | null
}

export type SearchResult = {
  searchTerm: string
  articles: Array<SearchArticle>
  totalCount: number
  itemCount: number
  page: number
  pageSize: number
}

export type ArticleFact = {
  id: number
  text: string
}

export type NutritionFact = Record<string, string | null>

export type ArticleDetail = {
  articleNumber: string
  celumId: string | null
  icons: Array<ApiIcon>
  description: string
  descriptionLong: string | null
  unitText: string | null
  price: number | null
  oldPrice: number | null
  pricePerSellUnit: number | null
  sellAmount: number | null
  sellUnit: string | null
  orderEndTimesText: string | null
  durability: string | null
  foodFact: string | null
  ingredients: string | null
  nutritionFact: NutritionFact | null
  allergenContains: Array<ArticleFact>
  allergenMayContains: Array<ArticleFact>
  specialDiet: Array<ArticleFact>
  hergestellt: Array<ArticleFact>
}

export type CartItem = {
  articleNumber: string
  celumId: string | null
  description: string
  unitText: string | null
  price: number
  quantity: number
  sellAmount: number | null
  sellUnit: string | null
}

/**
 * Ein Warenkorb wird immer über einen expliziten Handle (`cartId`) adressiert.
 * Der Handle ist ein Wert, den ein Client (Browser-Session, LLM, MCP-Host)
 * speichern und bei jedem Aufruf wieder mitgeben kann. So bleibt der Core
 * frei von Sessions und Cookies.
 */
export type CartState = {
  cartId: string
  items: Array<CartItem>
  totalItems: number
  totalAmount: number
}

export type CheckoutResult = {
  cartId: string
  orderNumber: string
  submittedAt: string
  totalItems: number
  totalAmount: number
}

export function productImageUrl(celumId: string | null): string | null {
  return celumId
    ? `https://webshop.transgourmet.ch/shop/productimages/${celumId}_300.jpg`
    : null
}
