// Liefert ein Sprachmodell des Vercel AI SDK anhand der .env (siehe .env.example):
//
//   AI_PROVIDER = google | openai | anthropic
//   AI_MODEL    = Modell-ID (optional)
//   <PROVIDER>_API_KEY

import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { createWireLogFetch } from './wire-log.ts'

try {
  process.loadEnvFile(new URL('../.env', import.meta.url))
} catch {
  // keine .env: Variablen müssen aus der Shell kommen
}

export function createModel({ logWire = process.env.AI_LOG_WIRE === '1' } = {}): LanguageModel {
  const provider = process.env.AI_PROVIDER
  const modelId = process.env.AI_MODEL
  const fetch = logWire ? createWireLogFetch() : undefined
  switch (provider) {
    case 'google':
      return createGoogle({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY, fetch })(modelId ?? 'gemini-3.1-flash-lite')
    case 'openai':
      return createOpenAI({ apiKey: process.env.OPENAI_API_KEY, fetch })(modelId ?? 'gpt-4.1-mini')
    case 'anthropic':
      return createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY, fetch })(modelId ?? 'claude-haiku-4-5')
    default:
      throw new Error('AI_PROVIDER muss google, openai oder anthropic sein. Siehe .env.example.')
  }
}
