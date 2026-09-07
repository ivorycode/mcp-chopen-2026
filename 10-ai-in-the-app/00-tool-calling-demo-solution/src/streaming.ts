// Streaming pur: ein Modell-Aufruf, kein Tool, kein Wire-Log.
// Live-Coding-Anleitung: siehe DEMO.md, Schritt 5.
//
//   npm run start:streaming
//   npm run start:streaming -- "Erkläre den Unterschied zwischen HTTP und WebSockets."

import { streamText } from 'ai'
import { createModel } from './provider.ts'

// Bewusst ohne Wire-Log: der Mitschnitt liest die Antwort vollständig, bevor
// das SDK sie erhält, und macht den Streaming-Effekt unsichtbar.
const model = createModel({ logWire: false })

const prompt = process.argv.slice(2).join(' ').trim()
  || 'Erkläre in drei Absätzen, warum Streaming für Chat-Oberflächen wichtig ist.'

console.log(`Modell: ${process.env.AI_PROVIDER} / ${process.env.AI_MODEL ?? 'Standard'}`)
console.log(`Prompt: ${prompt}\n`)

const start = Date.now()
let firstChunk: number | undefined

// streamText gibt sofort zurück; die Antwort kommt stückweise über textStream.
const result = streamText({ model, prompt })

for await (const text of result.textStream) {
  firstChunk ??= Date.now() - start
  process.stdout.write(text)
}

const seconds = ((Date.now() - start) / 1000).toFixed(1)
console.log(`\n\n(erster Chunk nach ${firstChunk} ms, fertig nach ${seconds} s, ${(await result.usage).totalTokens} Tokens)`)
