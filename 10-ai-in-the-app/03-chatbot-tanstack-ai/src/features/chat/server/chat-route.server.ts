// Chat-Endpunkt: nimmt die Nachrichten des Clients entgegen, führt die
// Tool-Calling-Schleife aus und streamt das Resultat als SSE (AG-UI-Protokoll).
//
// Die Server-Implementierungen der Tools sind dünne Adapter auf
// lokalen Shop-Core. Die Demo-Konto-ID (loginId) kommt aus der Session –
// wie in src/lib/shop.server.ts, nicht vom Modell.

import { chat, maxIterations, toServerSentEventsResponse } from '@tanstack/ai'
import type { ModelMessage } from '@tanstack/ai'
import type {
  CartResult,
  CheckoutToolResult,
} from '../../../lib/tools/results.ts'
import { getCurrentAccount } from '../../../lib/session.server.ts'
import { getChatSystemPrompt } from '../shared/chat-config.ts'
import { chatLimits, guardChatRequest } from './chat-guard.server.ts'
import { createAdapter, resolveProvider } from './adapter.server.ts'
import { toolHandlers } from '../../../lib/tools/handlers.server.ts'
import {
  addToCartDef,
  checkoutDef,
  getCartDef,
  removeFromCartDef,
  searchProductsDef,
} from '../shared/tools.ts'

const LOGIN_REQUIRED = {
  ok: false,
  error: 'Bitte zuerst anmelden, um den Warenkorb zu verwenden.',
} as const

/** Liefert die Konto-ID der Session oder null (nicht angemeldet). */
function currentLoginId(): string | null {
  const user = getCurrentAccount()
  return user ? user.loginId : null
}

const searchProducts = searchProductsDef.server((input) =>
  toolHandlers.searchProducts(input),
)

const NOT_IMPLEMENTED = {
  ok: false,
  error: 'Noch nicht implementiert – siehe EXERCISE.md.',
} as const

const getCart = getCartDef.server((): CartResult => {
  const loginId = currentLoginId()
  // TODO (Schritt 2): getCart über toolHandlers implementieren.
  return loginId ? NOT_IMPLEMENTED : LOGIN_REQUIRED
})

const addToCart = addToCartDef.server(async (_input): Promise<CartResult> => {
  const loginId = currentLoginId()
  // TODO (Schritt 3): addToCart über toolHandlers implementieren.
  return loginId ? NOT_IMPLEMENTED : LOGIN_REQUIRED
})

const removeFromCart = removeFromCartDef.server((_input): CartResult => {
  const loginId = currentLoginId()
  // TODO (Schritt 4): removeFromCart über toolHandlers implementieren.
  return loginId ? NOT_IMPLEMENTED : LOGIN_REQUIRED
})

const checkout = checkoutDef.server((): CheckoutToolResult => {
  const loginId = currentLoginId()
  // TODO (Schritt 6): checkout über toolHandlers implementieren.
  return loginId ? NOT_IMPLEMENTED : LOGIN_REQUIRED
})

/**
 * Stellt die zeitliche Reihenfolge des Verlaufs wieder her.
 *
 * Der Client fasst pro Assistenten-Nachricht den gesamten Text und alle
 * Tool-Calls in EINE Nachricht zusammen, gefolgt von den Tool-Resultaten:
 *
 *   assistant { content: "Antworttext", toolCalls } → tool → user
 *
 * Tatsächlich entstand der Text erst NACH dem Tool-Resultat. Gemini macht
 * daraus `model [text, functionCall]` / `user [functionResponse, neue Frage]`
 * und antwortet dann nicht mehr sinnvoll (führt z. B. den User-Text fort).
 * Hier wird der Text hinter die Tool-Resultate verschoben:
 *
 *   assistant { toolCalls } → tool → assistant { content }
 */
function restoreToolCallOrder(
  messages: Array<ModelMessage>,
): Array<ModelMessage> {
  const result: Array<ModelMessage> = []

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index]
    const hasToolCalls =
      message.role === 'assistant' && (message.toolCalls?.length ?? 0) > 0
    const hasText =
      typeof message.content === 'string' && message.content.trim() !== ''

    if (!hasToolCalls || !hasText) {
      result.push(message)
      continue
    }

    result.push({ ...message, content: '' })

    let next = index + 1
    while (next < messages.length && messages[next].role === 'tool') {
      result.push(messages[next])
      next++
    }

    if (next === index + 1) {
      // Keine Tool-Resultate: Text bleibt an Ort und Stelle.
      result[result.length - 1] = message
      continue
    }

    result.push({
      ...(message.id ? { id: `${message.id}-text` } : {}),
      role: 'assistant',
      content: message.content,
    })
    index = next - 1
  }

  return result
}

export async function handleChatRequest(request: Request): Promise<Response> {
  // Guard liest einen Clone; der Originalbody enthält zusätzlich resume/threadId/runId.
  const guarded = await guardChatRequest<ModelMessage>(request.clone())
  if (!guarded.ok)
    return Response.json({ error: guarded.error }, { status: guarded.status })
  const body = await request.json()

  const stream = chat({
    adapter: createAdapter(),
    messages: restoreToolCallOrder(guarded.messages),
    systemPrompts: [getChatSystemPrompt(guarded.mode)],
    tools: [searchProducts, getCart, addToCart, removeFromCart, checkout],
    agentLoopStrategy: maxIterations(chatLimits.maxSteps),
    modelOptions: {
      [resolveProvider() === 'google'
        ? 'maxOutputTokens'
        : resolveProvider() === 'anthropic'
          ? 'max_tokens'
          : 'max_output_tokens']: chatLimits.maxOutputTokens,
    },
    abortController: requestAbortController(request),
    threadId: body.threadId,
    runId: body.runId,
    // Antworten auf Interrupts (z. B. Checkout-Bestätigung) werden vom
    // Client im Feld `resume` mitgeschickt.
    resume: body.resume,
  })

  return toServerSentEventsResponse(stream)
}

function requestAbortController(request: Request): AbortController {
  const controller = new AbortController()
  const signal = AbortSignal.any([
    request.signal,
    AbortSignal.timeout(chatLimits.timeoutMs),
  ])
  if (signal.aborted) controller.abort(signal.reason)
  else
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    })
  return controller
}
