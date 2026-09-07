// Assistant: Text und Shop-Events. Workspace: Tool-Widgets und direkte Web-API-Aktionen.
// TanStack AI streamt AG-UI und verwendet Interrupts für die Checkout-Freigabe.

import { useEffect, useRef, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react'
import { createChatClientOptions } from '@tanstack/ai-client'
import type { InferChatMessages } from '@tanstack/ai-client'
import { MessageCircle, SendHorizonal, Sparkles, X } from 'lucide-react'
import type { SearchProductsResult } from '../../../lib/tools/results.ts'
import {
  dispatchCartChanged,
  dispatchShopSearch,
} from '../../../lib/shop-events.ts'
import { chatStarterPrompts, toolDefinitions } from '../shared/tools.ts'
import type { ToolOutputs } from '../shared/tools.ts'

import {
  articleImageUrl as getArticleImageUrl,
  formatMoney,
} from '../../../lib/media.ts'
import { addToCart, checkoutCart } from '../../../lib/client-api.ts'
import type { ChatMode } from '../shared/chat-config.ts'

// Die Tool-Definitionen machen `part.name` und `interrupts` typisiert.
const chatOptions = createChatClientOptions({
  connection: fetchServerSentEvents('/api/chat'),
  tools: toolDefinitions,
})

type ChatMessage = InferChatMessages<typeof chatOptions>[number]
type MessagePart = ChatMessage['parts'][number]
type ToolCallPart = Extract<MessagePart, { type: 'tool-call' }>

function isVisiblePart(part: MessagePart, mode: ChatMode) {
  // Leere Text-Parts überspringen: Während des Streamings kann ein Text-Part
  // noch ohne Inhalt sein. Sonst blitzt eine leere Blase auf, und eine reine
  // Tool-Antwort im Workspace hinterliesse eine leere Nachricht.
  if (part.type === 'text') return Boolean(part.content)
  if (part.type !== 'tool-call') return false
  if (mode === 'workspace') return true
  const output = part.output as { ok?: boolean } | undefined
  return (
    part.state === 'error' ||
    (part.state === 'complete' && (!output || output.ok === false))
  )
}

export default function ChatbotWidget({
  mode = 'assistant',
}: {
  mode?: ChatMode
}) {
  const isScreenMode = mode === 'workspace'
  // Der schwebende Widget-Chat blendet sich auf der eigenen Chat-Route aus.
  const isOnChatRoute = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === '/chat'),
  })
  const [isOpen, setIsOpen] = useState(isScreenMode)
  const [input, setInput] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const processedToolCallIds = useRef(new Set<string>())

  const {
    messages,
    sendMessage,
    clear,
    setMessages,
    isLoading,
    error,
    interrupts,
    resuming,
  } = useChat({ ...chatOptions, body: { mode } })

  const hasMessages = messages.length > 0
  const isBusy = isLoading || resuming || actionBusy

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, isBusy, interrupts])

  // Abgeschlossene Tool-Aufrufe an die Shop-Oberfläche melden (einmal pro Aufruf).
  useEffect(() => {
    let searchTerm: string | null = null

    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type !== 'tool-call' || part.state !== 'complete') continue
        if (processedToolCallIds.current.has(part.id)) continue
        processedToolCallIds.current.add(part.id)

        if (part.name === 'searchProducts') {
          const output = part.output as SearchProductsResult | undefined
          if (output?.ok) searchTerm = output.searchTerm
        }
      }
    }

    // TODO (Schritt 5): Nach erfolgreichen Cart-Tools Cache invalidieren und dispatchCartChanged aufrufen.
    if (searchTerm) dispatchShopSearch(searchTerm)
  }, [messages])

  async function submitPrompt(prompt: string) {
    const text = prompt.trim()
    if (!text || isBusy) return
    if (!isScreenMode) setIsOpen(true)
    setInput('')
    requestAnimationFrame(() => inputRef.current?.focus())
    // TODO Schritt 6: Im Assistant eine offene Freigabe mit Ja/Nein auflösen.
    await sendMessage(text)
  }

  async function runDirectAction(action: () => Promise<string>) {
    if (isBusy) return
    setActionBusy(true)
    setActionError(null)
    try {
      const text = await action()
      dispatchCartChanged()
      setMessages([
        ...messages,
        {
          id: crypto.randomUUID(),
          role: 'user',
          parts: [{ type: 'text', content: text }],
        },
      ])
    } catch (cause) {
      setActionError(
        cause instanceof Error ? cause.message : 'Aktion fehlgeschlagen.',
      )
    } finally {
      setActionBusy(false)
    }
  }

  const actions: DirectActions = {
    disabled: isBusy,
    add: (articleNumber) =>
      void runDirectAction(async () => {
        const cart = await addToCart(articleNumber, 1)
        return `Artikel ${articleNumber} über den Button in den Warenkorb gelegt. Der Warenkorb enthält jetzt ${cart.totalItems} Artikel.`
      }),
    checkout: () =>
      void runDirectAction(async () => {
        const order = await checkoutCart()
        return `Bestellung ${order.orderId} mit ${order.totalItems} Artikeln (${formatMoney(order.totalAmount)}) über den Button abgeschickt.`
      }),
  }

  if (!isScreenMode && isOnChatRoute) return null

  return (
    <div
      className={`chatbot-shell${isScreenMode ? ' chatbot-shell-screen' : ''}`}
    >
      {isOpen ? (
        <section
          className={`chatbot-panel rise-in${
            isScreenMode ? ' chatbot-panel-screen' : ''
          }`}
          aria-label="Chatbot"
        >
          <header className="chatbot-header">
            <div>
              <p className="chatbot-kicker">
                KI-Einkaufsassistent · TanStack AI
              </p>
              <h2 className="chatbot-title">Shop Chat</h2>
            </div>
            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-text-button"
                onClick={() => {
                  clear()
                  processedToolCallIds.current.clear()
                }}
                disabled={!hasMessages || isBusy}
              >
                Leeren
              </button>
              {!isScreenMode ? (
                <button
                  type="button"
                  className="chatbot-icon-button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Chat schliessen"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>
          </header>

          <div className="chatbot-transcript" ref={scrollRef}>
            <div className="chatbot-transcript-inner">
              {!hasMessages ? (
                <div className="chatbot-empty-state">
                  <div className="chatbot-empty-icon">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3>Fragen zu Produkten oder zum Warenkorb stellen.</h3>
                    <p>
                      Der Assistent sucht Produkte, legt Artikel in den
                      Warenkorb und schliesst die Bestellung nach Bestätigung
                      ab.
                    </p>
                  </div>
                </div>
              ) : null}

              {messages.map((message) => {
                const visibleParts = message.parts.filter((part) =>
                  isVisiblePart(part, mode),
                )
                if (visibleParts.length === 0) return null

                return (
                  <article
                    key={message.id}
                    className={`chatbot-message chatbot-message-${message.role}`}
                  >
                    <div className="chatbot-message-label">
                      {message.role === 'user' ? 'Sie' : 'Assistent'}
                    </div>
                    <div className="chatbot-bubble-stack">
                      {visibleParts.map((part, index) => (
                        <MessagePartView
                          key={`${message.id}-${index}`}
                          part={part}
                          actions={actions}
                        />
                      ))}
                    </div>
                  </article>
                )
              })}

              {/* TODO (Schritt 6): Freigabe-UI für interrupts mit resolveInterrupt ergänzen. */}

              {actionError ? (
                <p role="alert" className="chatbot-system-note">
                  {actionError}
                </p>
              ) : null}
              {error ? (
                <div className="chatbot-system-note chatbot-system-note-error">
                  {error.message}
                </div>
              ) : null}
            </div>
          </div>

          {!hasMessages ? (
            <div className="chatbot-prompts">
              {chatStarterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="chatbot-prompt"
                  onClick={() => void submitPrompt(prompt)}
                  disabled={isBusy}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="chatbot-composer"
            onSubmit={(event) => {
              event.preventDefault()
              void submitPrompt(input)
            }}
          >
            <label className="sr-only" htmlFor="chatbot-input">
              Nachricht eingeben
            </label>
            <input
              id="chatbot-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="z. B. Suche Mozzarella oder zeig mir den Warenkorb"
              className="chatbot-input"
            />
            <button
              type="submit"
              className="chatbot-submit"
              disabled={isBusy || !input.trim()}
            >
              <SendHorizonal size={16} />
            </button>
          </form>
        </section>
      ) : null}

      {!isScreenMode ? (
        <button
          type="button"
          className="chatbot-launcher"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-label="Chatbot öffnen"
        >
          <span className="chatbot-launcher-icon">
            <MessageCircle size={18} />
          </span>
          <span>
            <strong>Shop Chat</strong>
            <small>Produkte suchen &amp; bestellen</small>
          </span>
        </button>
      ) : null}
    </div>
  )
}

type DirectActions = {
  add: (articleNumber: string) => void
  checkout: () => void
  disabled: boolean
}

function MessagePartView({
  part,
  actions,
}: {
  part: MessagePart
  actions: DirectActions
}) {
  // Nur Parts, die `isVisiblePart` durchgelassen hat, landen hier.
  if (part.type === 'text') {
    return <div className="chatbot-bubble">{part.content}</div>
  }

  if (part.type === 'tool-call') {
    return <ToolCallView part={part} actions={actions} />
  }

  return null
}

function ToolCallView({
  part,
  actions,
}: {
  part: ToolCallPart
  actions: DirectActions
}) {
  if (part.state === 'error') {
    return (
      <div className="chatbot-system-note chatbot-system-note-error">
        Die Tool-Ausführung ist fehlgeschlagen.
      </div>
    )
  }

  if (part.state === 'approval-requested') {
    return <div className="chatbot-system-note">Warte auf Bestätigung ...</div>
  }

  if (part.state !== 'complete') {
    return <div className="chatbot-system-note">{pendingLabel(part.name)}</div>
  }

  if (part.output === undefined) {
    // Abgelehnter Aufruf (Interrupt mit approved=false) hat kein Resultat.
    return <div className="chatbot-system-note">{part.name}: abgebrochen.</div>
  }

  switch (part.name) {
    case 'searchProducts':
      return (
        <SearchResultView
          output={part.output as ToolOutputs['searchProducts']}
          actions={actions}
        />
      )
    case 'getCart':
    case 'addToCart':
    case 'removeFromCart':
      // TODO (Schritt 5): Erfolgreiche Resultate als Warenkorb rendern.
      return (
        <pre className="chatbot-system-note">
          {JSON.stringify(part.output, null, 2)}
        </pre>
      )
    case 'checkout':
      // TODO (Schritt 6): Bestellbestätigung mit Bestellnummer rendern.
      return (
        <pre className="chatbot-system-note">
          {JSON.stringify(part.output, null, 2)}
        </pre>
      )
    default:
      return null
  }
}

function pendingLabel(toolName: string) {
  switch (toolName) {
    case 'searchProducts':
      return 'Suche passende Produkte ...'
    case 'getCart':
      return 'Lade den Warenkorb ...'
    case 'addToCart':
      return 'Lege den Artikel in den Warenkorb ...'
    case 'removeFromCart':
      return 'Entferne den Artikel ...'
    case 'checkout':
      return 'Schliesse die Bestellung ab ...'
    default:
      return `${toolName} ...`
  }
}

function SearchResultView({
  output,
  actions,
}: {
  output: SearchProductsResult
  actions: DirectActions
}) {
  if (!output.ok) return <ErrorNote error={output.error} />

  return (
    <section className="chatbot-card-grid">
      <div className="chatbot-result-meta">
        <strong>{output.totalCount} Treffer</strong> für "{output.searchTerm}"
      </div>
      {output.articles.map((article) => (
        <article key={article.articleNumber} className="chatbot-product-card">
          <div className="chatbot-product-topline">
            <span className="chatbot-article-badge">
              {article.articleNumber}
            </span>
            <span className="chatbot-price">{formatMoney(article.price)}</span>
          </div>
          <div className="chatbot-product-body">
            <div className="chatbot-product-thumb">
              {getArticleImageUrl(article.celumId) ? (
                <img
                  src={getArticleImageUrl(article.celumId) ?? undefined}
                  alt={article.description}
                />
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
              <p>
                {article.sellAmount ?? '-'} {article.sellUnit ?? ''}
              </p>
            </div>
          </div>
          <div className="chatbot-action-row">
            <button
              type="button"
              className="chatbot-primary-action"
              disabled={actions.disabled}
              onClick={() => actions.add(article.articleNumber)}
            >
              In den Warenkorb
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}

function ErrorNote({ error }: { error: string }) {
  return (
    <div className="chatbot-system-note chatbot-system-note-error">{error}</div>
  )
}
