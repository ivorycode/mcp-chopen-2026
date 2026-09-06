// Absolut minimales Tool-Calling-Demo mit dem Vercel AI SDK.
// Live-Coding-Anleitung: siehe DEMO.md.
//
//   npm start
//   npm start -- "Wie ist das Wetter in Bern und in Zürich?"

import { generateText, isStepCount, tool } from 'ai'
import { z } from 'zod'
import { createModel } from './provider.ts'

const args = process.argv.slice(2)
const model = createModel({ logWire: args.includes('--log-wire') ? true : undefined })

const getWeather = tool({
  description: 'Liefert das aktuelle Wetter für einen Ort.',
  inputSchema: z.object({
    city: z.string().describe('Name des Ortes'),
  }),
  execute: ({ city }) => {
    console.log(`  [Tool] getWeather(${JSON.stringify(city)})`)
    return { city, temperature: 7 + (city.length % 15), condition: 'sonnig' }
  },
})

const prompt = args.filter((arg) => arg !== '--log-wire').join(' ').trim() || 'Wie ist das Wetter in Bern?'
console.log(`Modell: ${process.env.AI_PROVIDER} / ${process.env.AI_MODEL ?? 'Standard'}`)
console.log(`Prompt: ${prompt}\n`)

const result = await generateText({
  model,
  prompt,
  tools: { getWeather },
  // Ohne Limit gäbe es keine Obergrenze für Modell-Aufrufe (= Kosten).
  stopWhen: isStepCount(4),
})

console.log(`\n${result.text}`)
console.log(`\n(${result.steps.length} Schritte, ${result.usage.totalTokens} Tokens)`)
