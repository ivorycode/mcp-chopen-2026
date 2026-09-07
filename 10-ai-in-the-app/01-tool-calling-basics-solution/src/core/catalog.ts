// Zugriff auf den Produktkatalog (Transgourmet-API oder lokaler Mock).

import type { ApiIcon, ArticleDetail, SearchArticle, SearchResult } from './types.ts'

function apiBaseUrl(): string {
  // Im Workshop zeigt TRANSGOURMET_API_ORIGIN auf den lokalen Mock (Port 4040).
  const origin = (process.env.TRANSGOURMET_API_ORIGIN ?? 'http://localhost:4040').replace(/\/$/, '')
  return `${origin}/de/webshop/resources/articles`
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${apiBaseUrl()}${path}`
  let response: Response
  try {
    response = await fetch(url, { headers: { accept: 'application/json, text/plain, */*' } })
  } catch (error) {
    throw new Error(
      `Katalog-API nicht erreichbar (${url}). Läuft die eigenständig gestartete Mock-API? – ${String(error)}`,
    )
  }
  if (!response.ok) {
    throw new Error(`Katalog-API antwortete mit Status ${response.status} (${url}).`)
  }
  return (await response.json()) as T
}

function mapIcons(input: unknown): Array<ApiIcon> {
  if (!Array.isArray(input)) return []
  return input
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry: any) => ({
      id: String(entry.id ?? ''),
      imgSrc: String(entry.imgSrc ?? ''),
      title: entry.title ? String(entry.title) : null,
    }))
    .filter((entry) => entry.id && entry.imgSrc)
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function mapSearchArticle(article: any): SearchArticle {
  return {
    articleNumber: String(article.articleNumber),
    celumId: article.celumId ? String(article.celumId) : null,
    icons: mapIcons(article.icons),
    description: article.description ?? 'Unbekannter Artikel',
    brand: article.brand ?? null,
    unitText: article.unitText ?? null,
    price: num(article.price),
    oldPrice: num(article.oldPrice),
    sellAmount: num(article.sellAmount),
    sellUnit: article.sellUnit ?? null,
    status: article.status ?? null,
  }
}

function mapFactList(input: unknown): Array<{ id: number; text: string }> {
  if (!Array.isArray(input)) return []
  return input.map((entry: any) => ({ id: Number(entry.id), text: String(entry.text) }))
}

export async function searchArticles(searchTerm: string): Promise<SearchResult> {
  const data = await fetchJson<any>(`/search?searchTerm=${encodeURIComponent(searchTerm)}`)
  const response = data.searchResponse ?? {}
  const articles = Array.isArray(response.articles) ? response.articles : []

  return {
    searchTerm: data.searchTerm ?? searchTerm,
    articles: articles.map(mapSearchArticle),
    totalCount: Number(response.totalCount ?? articles.length ?? 0),
    itemCount: Number(response.itemCount ?? articles.length ?? 0),
    page: Number(response.page ?? 1),
    pageSize: Number(response.pageSize ?? articles.length ?? 0),
  }
}

export async function getArticleDetail(articleNumber: string): Promise<ArticleDetail> {
  const data = await fetchJson<any>(`/${encodeURIComponent(articleNumber)}/detail`)
  const article = data.article ?? {}

  return {
    articleNumber: String(article.articleNumber ?? articleNumber),
    celumId: article.celumId ? String(article.celumId) : null,
    icons: mapIcons(article.icons),
    description: article.description ?? 'Unbekannter Artikel',
    descriptionLong: article.descriptionLong ?? null,
    unitText: article.unitText ?? null,
    price: num(article.price),
    oldPrice: num(article.oldPrice),
    pricePerSellUnit: num(article.pricePerSellUnit),
    sellAmount: num(article.sellAmount),
    sellUnit: article.sellUnit ?? null,
    orderEndTimesText: article.orderEndTimesText ?? null,
    durability: article.durability ?? null,
    foodFact: article.foodFact ?? null,
    ingredients: article.ingredients ?? null,
    nutritionFact:
      article.nutritionFact && typeof article.nutritionFact === 'object' ? article.nutritionFact : null,
    allergenContains: mapFactList(article.allergenContains),
    allergenMayContains: mapFactList(article.allergenMayContains),
    specialDiet: mapFactList(article.specialDiet),
    hergestellt: mapFactList(article.hergestellt),
  }
}
