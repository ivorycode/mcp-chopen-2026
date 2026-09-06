// Tool-Calling-Schleife mit dem Vercel AI SDK: generateText führt Tools aus
// und ruft das Modell so lange erneut auf, bis es ohne Tool-Aufruf antwortet
// oder stopWhen greift. Jeder Schritt wird geloggt.
//
//   npm start
//   npm start -- "Was kostet Basmati-Reis?"

import './env.ts'
import { createModel, describeModel } from './provider.ts'
import { generateText, isStepCount } from 'ai'
import { DEFAULT_PROMPT, instructions, shopTools, short } from './shop-tools.ts'

const prompt = process.argv.slice(2).join(' ').trim() || DEFAULT_PROMPT
let step = 0

console.log(`Modell:  ${describeModel()}`)
console.log(`Prompt:  ${prompt}\n`)

const result = await generateText({
  model: createModel(),
  instructions,
  prompt,
  tools: shopTools,
  // Ohne Schleifen-Limit gäbe es keine Obergrenze für Modell-Aufrufe (= Kosten).
  stopWhen: isStepCount(8),
  onStepEnd: ({ toolCalls, toolResults, text, finishReason }) => {
    step += 1
    console.log(`--- Schritt ${step} (finishReason: ${finishReason}) ---`)
    for (const call of toolCalls) {
      console.log(`  Tool-Aufruf  ${call.toolName}(${JSON.stringify(call.input)})`)
    }
    for (const toolResult of toolResults) {
      console.log(`  Tool-Resultat ${toolResult.toolName} → ${short(toolResult.output)}`)
    }
    if (text) console.log(`  Text: ${text}`)
  },
})

console.log('\n=== Antwort ===')
console.log(result.text)
console.log(`\nSchritte: ${result.steps.length}, Tokens: ${result.usage.totalTokens}`)
