// Workspace-Modus: Tool-Parts werden als Widgets direkt im Chat dargestellt.
// Die eindeutigen Buttons «In den Warenkorb» und «Bestellung abschliessen»
// rufen die Shop-API direkt auf, ohne Umweg über das Modell.

import { getToolName, isToolUIPart } from 'ai'
import { articleImageUrl, formatMoney } from '../../../lib/media.ts'
import type { ShopPart } from './assistant-mode.ts'

export type WidgetActions = {
  onAddArticle: (articleNumber: string) => void
  onCheckout: () => void
  onApprove: (approvalId: string, approved: boolean) => void
  actionsDisabled: boolean
}

type PartOfType<T extends ShopPart['type']> = Extract<
  ShopPart,
  { type: T; state: 'output-available' }
>
type SearchOutput = Extract<
  PartOfType<'tool-searchProducts'>['output'],
  { ok: true }
>

export function ToolPartView({
  part,
  actions,
}: {
  part: ShopPart
  actions: WidgetActions
}) {
  if (!isToolUIPart(part)) return null

  // Zustände, die für alle Tools gleich behandelt werden
  if (part.state === 'output-error') {
    return <Note error text={part.errorText} />
  }
  if (part.state === 'output-denied')
    return <Note text="Bestellung nicht ausgelöst." />

  switch (part.type) {
    case 'tool-searchProducts':
      if (part.state !== 'output-available') {
        return (
          <Note
            text={`Suche läuft${part.input?.term ? ` nach "${part.input.term}"` : ''}...`}
          />
        )
      }
      if (!part.output.ok) return <Note error text={part.output.error} />
      return <SearchResultCards output={part.output} actions={actions} />

    case 'tool-getCart':
    case 'tool-addToCart':
    case 'tool-removeFromCart':
      // TODO Schritt 5: CartResult als Tabelle mit Artikel, Menge und Preisen rendern.
      return <pre>{JSON.stringify(part, null, 2)}</pre>

    case 'tool-checkout':
      // TODO Schritt 6: approval-requested mit actions.onApprove beantworten;
      // danach Fehler, Abbruch und Bestellbestätigung darstellen.
      return <pre>{JSON.stringify(part, null, 2)}</pre>

    default:
      return <Note text={`${getToolName(part)}: ${part.state}`} />
  }
}

function Note({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div
      className={`chatbot-system-note${error ? ' chatbot-system-note-error' : ''}`}
    >
      {text}
    </div>
  )
}

function SearchResultCards({
  output,
  actions,
}: {
  output: SearchOutput
  actions: WidgetActions
}) {
  return (
    <section className="chatbot-card-grid">
      <div className="chatbot-result-meta">
        <strong>{output.totalCount} Treffer</strong> für "{output.searchTerm}"
      </div>
      {output.articles.map((article) => {
        const image = articleImageUrl(article.celumId)
        return (
          <article key={article.articleNumber} className="chatbot-product-card">
            <div className="chatbot-product-topline">
              <span className="chatbot-article-badge">
                {article.articleNumber}
              </span>
              <span className="chatbot-price">
                {formatMoney(article.price)}
              </span>
            </div>
            <div className="chatbot-product-body">
              <div className="chatbot-product-thumb">
                {image ? (
                  <img src={image} alt={article.description} loading="lazy" />
                ) : (
                  <div className="article-thumb-fallback">Kein Bild</div>
                )}
              </div>
              <div className="chatbot-product-copy">
                <h3>{article.description}</h3>
                <p>
                  {article.brand ? `${article.brand} · ` : ''}
                  {article.unitText ?? '-'}
                </p>
              </div>
            </div>
            <div className="chatbot-action-row">
              <button
                type="button"
                className="chatbot-primary-action"
                disabled={actions.actionsDisabled}
                onClick={() => actions.onAddArticle(article.articleNumber)}
              >
                In den Warenkorb
              </button>
            </div>
          </article>
        )
      })}
    </section>
  )
}
