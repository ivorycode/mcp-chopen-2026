// Dieselbe Schleife von Hand, ohne die automatische Schleife des SDK:
// Die Tools werden OHNE execute-Funktion deklariert. Das Modell kann sie
// anfordern, aber niemand führt sie aus – das übernimmt dieser Code selbst:
// Tool-Aufruf lesen, Handler aufrufen, Resultat als 'tool'-Nachricht an die
// Historie anhängen, Modell erneut aufrufen. Genau das tut generateText intern.
//
//   npm run manual

import './env.ts'
import { createModel, describeModel } from './provider.ts'
import { addToCartInput, emptyInput, searchProductsInput, toolDescriptions } from './core/contracts.ts'
import * as toolHandlers from './core/handlers.ts'
import { generateText, tool } from 'ai'
import type { ModelMessage } from 'ai'
import { CART_ID, DEFAULT_PROMPT, instructions, short } from './shop-tools.ts'

const MAX_ROUNDS = 8
const prompt = process.argv.slice(2).join(' ').trim() || DEFAULT_PROMPT

// Nur Beschreibung + Schema – keine execute-Funktion.
const declaredTools = {
  searchProducts: tool({ description: toolDescriptions.searchProducts, inputSchema: searchProductsInput }),
  getCart: tool({ description: toolDescriptions.getCart, inputSchema: emptyInput }),
  addToCart: tool({ description: toolDescriptions.addToCart, inputSchema: addToCartInput }),
}

// Die Ausführung liegt in diesem Skript.
async function runTool(name: string, input: unknown): Promise<unknown> {
  switch (name) {
    case 'searchProducts':
      return toolHandlers.searchProducts(input as { term: string })
    case 'getCart':
      return toolHandlers.getCart(CART_ID)
    case 'addToCart':
      return toolHandlers.addToCart(CART_ID, input as { articleNumber: string; quantity?: number })
    default:
      return { ok: false, error: `Unbekanntes Tool ${name}` }
  }
}

const messages: Array<ModelMessage> = [{ role: 'user', content: prompt }]
console.log(`Modell:  ${describeModel()}`)
console.log(`Prompt:  ${prompt}\n`)

for (let round = 1; round <= MAX_ROUNDS; round++) {
  // 1. Modell aufrufen – ein einzelner Schritt.
  const step = await generateText({ model: createModel(), instructions, messages, tools: declaredTools })
  console.log(`--- Runde ${round} (finishReason: ${step.finishReason}) ---`)

  // 2. Antwort des Modells (Text und/oder Tool-Aufrufe) an die Historie anhängen.
  messages.push(...step.responseMessages)

  // 3. Keine Tool-Aufrufe? Dann ist das Modell fertig.
  if (step.toolCalls.length === 0) {
    console.log('\n=== Antwort ===')
    console.log(step.text)
    break
  }

  // 4. Jeden Tool-Aufruf ausführen und das Resultat als 'tool'-Nachricht zurückgeben.
  for (const call of step.toolCalls) {
    console.log(`  Tool-Aufruf  ${call.toolName}(${JSON.stringify(call.input)})`)
    const output = await runTool(call.toolName, call.input)
    console.log(`  Tool-Resultat ${call.toolName} → ${short(output)}`)
    messages.push({
      role: 'tool',
      content: [{ type: 'tool-result', toolCallId: call.toolCallId, toolName: call.toolName, output: { type: 'json', value: output as never } }],
    })
  }
  // 5. Nächste Runde: Das Modell sieht jetzt die Tool-Resultate.
}
