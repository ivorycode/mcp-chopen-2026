import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogle } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, isStepCount, tool } from 'ai'
import { z } from 'zod'
import { createWireLogFetch } from './wire-log.ts'

const call = { name: 'getWeather', args: { city: 'Bern' } }
const answer = 'In Bern sind es 12 Grad.'
const fixtures = [
  {
    provider: 'google',
    model: (baseURL: string, fetch: typeof globalThis.fetch) => createGoogle({ baseURL, fetch, apiKey: 'test-secret' })('gemini-test'),
    responses: [
      { candidates: [{ content: { role: 'model', parts: [{ functionCall: call, thoughtSignature: 'test-signature' }] }, finishReason: 'STOP' }] },
      { candidates: [{ content: { role: 'model', parts: [{ text: answer }] }, finishReason: 'STOP' }] },
    ],
    toolResult: 'functionResponse',
  },
  {
    provider: 'openai',
    model: (baseURL: string, fetch: typeof globalThis.fetch) => createOpenAI({ baseURL, fetch, apiKey: 'test-secret' })('gpt-test'),
    responses: [
      { id: 'resp_1', output: [{ type: 'function_call', id: 'fc_1', call_id: 'call_1', name: call.name, arguments: JSON.stringify(call.args) }] },
      { id: 'resp_2', output: [{ type: 'message', id: 'msg_1', role: 'assistant', content: [{ type: 'output_text', text: answer, annotations: [] }] }] },
    ],
    toolResult: 'function_call_output',
  },
  {
    provider: 'anthropic',
    model: (baseURL: string, fetch: typeof globalThis.fetch) => createAnthropic({ baseURL, fetch, apiKey: 'test-secret' })('claude-test'),
    responses: [
      { type: 'message', content: [{ type: 'tool_use', id: 'call_1', name: call.name, input: call.args }], stop_reason: 'tool_use', usage: { input_tokens: 10, output_tokens: 10 } },
      { type: 'message', content: [{ type: 'text', text: answer }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } },
    ],
    toolResult: 'tool_result',
  },
]

for (const fixture of fixtures) {
  test(`${fixture.provider}: HTTP-Bodies und vollständige Tool-Schleife`, async (t) => {
    const logRoot = await mkdtemp(join(tmpdir(), 'wire-log-test-'))
    t.after(() => rm(logRoot, { recursive: true, force: true }))
    const requests: string[] = []
    const server = createServer(async (req, res) => {
      const chunks = []
      for await (const chunk of req) chunks.push(Buffer.from(chunk))
      requests.push(Buffer.concat(chunks).toString())
      assert.ok(Object.values(req.headers).some((value) => String(value).includes('test-secret')))
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(fixture.responses[requests.length - 1]))
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    t.after(() => new Promise<void>((resolve, reject) => {
      server.closeAllConnections()
      server.close((error) => error ? reject(error) : resolve())
    }))
    const address = server.address()
    assert.ok(address && typeof address !== 'string')
    let executions = 0
    const result = await generateText({
      model: fixture.model(`http://127.0.0.1:${address.port}`, createWireLogFetch({ logRoot })),
      prompt: 'Wie ist das Wetter in Bern?',
      tools: {
        getWeather: tool({
          description: 'Wetter für einen Ort',
          inputSchema: z.object({ city: z.string() }),
          execute: ({ city }) => {
            executions++
            return { city, temperature: 12 }
          },
        }),
      },
      stopWhen: isStepCount(4),
      maxOutputTokens: 100,
      maxRetries: 0,
    })
    assert.equal(result.text, answer)
    assert.equal(result.steps.length, 2)
    assert.equal(executions, 1)
    assert.equal(requests.length, 2)
    const [run] = await readdir(logRoot)
    for (let i = 0; i < 2; i++) {
      const prefix = join(logRoot, run, `0${i + 1}`)
      assert.equal(await readFile(`${prefix}.request.txt`, 'utf8'), requests[i])
      assert.equal(await readFile(`${prefix}.response.txt`, 'utf8'), JSON.stringify(fixture.responses[i]))
      assert.doesNotMatch(await readFile(`${prefix}.md`, 'utf8'), /test-secret/)
    }
    assert.match(requests[0], /getWeather/)
    assert.ok(requests[1].includes(fixture.toolResult))
    assert.match(requests[1], /temperature/)
  })
}

test('Request-Objekt, HTTP-Fehler und Credentials werden korrekt behandelt', async (t) => {
  const logRoot = await mkdtemp(join(tmpdir(), 'wire-log-test-'))
  t.after(() => rm(logRoot, { recursive: true, force: true }))
  const input = new Request('https://example.test/api?key=query-secret', {
    method: 'POST', headers: { authorization: 'Bearer header-secret' }, body: '{"city":"Zürich"}',
  })
  const response = new Response('Too many requests', { status: 429, headers: { 'retry-after': '2' } })
  const fetch = createWireLogFetch({ logRoot, fetch: async (request) => {
    assert.equal(request, input)
    assert.equal(input.headers.get('authorization'), 'Bearer header-secret')
    assert.equal(await input.text(), '{"city":"Zürich"}')
    return response
  } })
  assert.equal(await fetch(input), response)
  assert.equal(await response.text(), 'Too many requests')
  assert.equal(response.headers.get('retry-after'), '2')
  const [run] = await readdir(logRoot)
  const markdown = await readFile(join(logRoot, run, '01.md'), 'utf8')
  assert.match(markdown, /HTTP 429/)
  assert.doesNotMatch(markdown, /query-secret|header-secret/)
})

test('Transportfehler bleiben erhalten; fehlgeschlagenes Logging verhindert keinen Request', async (t) => {
  const logRoot = await mkdtemp(join(tmpdir(), 'wire-log-test-'))
  t.after(() => rm(logRoot, { recursive: true, force: true }))
  const error = new Error('secret-in-transport-error')
  const fetch = createWireLogFetch({ logRoot, fetch: async () => { throw error } })
  await assert.rejects(fetch('https://example.test'), (caught) => caught === error)
  const [run] = await readdir(logRoot)
  const markdown = await readFile(join(logRoot, run, '01.md'), 'utf8')
  assert.match(markdown, /Transportfehler/)
  assert.doesNotMatch(markdown, /secret-in-transport-error/)

  const blocked = join(logRoot, 'file-not-directory')
  await writeFile(blocked, '')
  let calls = 0
  const fetchWithoutLog = createWireLogFetch({ logRoot: blocked, fetch: async () => {
    calls++
    return new Response('ok')
  } })
  assert.equal(await (await fetchWithoutLog('https://example.test')).text(), 'ok')
  assert.equal(calls, 1)
})
