// Adapter-Auswahl per AI_PROVIDER (openai | anthropic | google).
//
// Gegenstück zum lokalen Vercel-AI-SDK-Adapter: dort liefert createModel()
// ein LanguageModel, hier liefert createAdapter() einen TanStack-AI-Adapter.
// Die Modell-IDs sind in TanStack AI typisierte Unions pro Provider.

import type { AnyTextAdapter } from '@tanstack/ai'
import { createAnthropicChat } from '@tanstack/ai-anthropic'
import { createGeminiChat } from '@tanstack/ai-gemini'
import { createOpenaiChat } from '@tanstack/ai-openai'

export type AiProvider = 'openai' | 'anthropic' | 'google'

const providers: Array<AiProvider> = ['openai', 'anthropic', 'google']

function requireKey(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} ist nicht gesetzt (siehe lokale .env.example).`)
  }
  return value
}

export function resolveProvider(): AiProvider {
  const value = (process.env.AI_PROVIDER ?? 'openai').toLowerCase()
  if (!providers.includes(value as AiProvider)) {
    throw new Error(
      `Unbekannter AI_PROVIDER "${value}". Erlaubt: ${providers.join(', ')}.`,
    )
  }
  return value as AiProvider
}

export function createAdapter(
  provider: AiProvider = resolveProvider(),
): AnyTextAdapter {
  const configuredModel = process.env.AI_MODEL
  switch (provider) {
    case 'openai':
      return createOpenaiChat(
        (configuredModel ?? 'gpt-5.4-mini') as never,
        requireKey('OPENAI_API_KEY'),
      ) as unknown as AnyTextAdapter
    case 'anthropic':
      return createAnthropicChat(
        (configuredModel ?? 'claude-haiku-4-5') as never,
        requireKey('ANTHROPIC_API_KEY'),
      ) as unknown as AnyTextAdapter
    case 'google':
      // TanStack AI würde GEMINI_API_KEY lesen; der Workshop verwendet den
      // Namen des Vercel AI SDK. Deshalb wird der Key explizit übergeben.
      return createGeminiChat(
        (configuredModel ?? 'gemini-3.5-flash') as never,
        requireKey('GOOGLE_GENERATIVE_AI_API_KEY'),
      ) as AnyTextAdapter
  }
}
