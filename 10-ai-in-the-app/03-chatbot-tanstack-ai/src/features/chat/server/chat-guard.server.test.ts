import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chatLimits, guardChatRequest } from './chat-guard.server.ts'

function chatRequest(body: unknown): Request {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const question = {
  id: 'question',
  role: 'user',
  content: 'Suche Milch',
}

test('accepts explicit chat modes, defaults older clients to workspace and rejects unknown modes', async () => {
  for (const mode of [undefined, 'workspace', 'assistant', 'other']) {
    const result = await guardChatRequest(
      chatRequest({ forwardedProps: { mode }, messages: [question] }),
    )
    if (mode === 'other') {
      assert.equal(result.ok, false)
      assert.equal(result.status, 400)
    } else {
      assert.equal(result.ok, true)
      assert.equal(result.mode, mode ?? 'workspace')
    }
  }
})

test('rejects malformed bodies with 400', async () => {
  const result = await guardChatRequest(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      body: 'no json',
    }),
  )
  assert.equal(result.ok, false)
  assert.equal(result.status, 400)
})

function alternatingMessages(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    ...question,
    id: `message-${index}`,
    role: index % 2 === 0 ? 'user' : 'assistant',
  }))
}

test('keeps nine messages with the default limit of fifteen', async () => {
  assert.equal(chatLimits.maxMessages, 15)
  const messages = alternatingMessages(9)
  const result = await guardChatRequest(chatRequest({ messages }))
  assert.equal(result.ok, true)
  assert.deepEqual(result.messages, messages)
})

test('starts truncated history at the first user message in both chat modes', async () => {
  const messages = alternatingMessages(chatLimits.maxMessages + 1)
  for (const mode of ['assistant', 'workspace']) {
    const result = await guardChatRequest(chatRequest({ mode, messages }))
    assert.equal(result.ok, true)
    assert.equal(result.messages[0].role, 'user')
    assert.ok(result.messages.length <= chatLimits.maxMessages)
    assert.deepEqual(result.messages, messages.slice(2))
  }
})

test('keeps the full window when it already starts with a user', async () => {
  const messages = alternatingMessages(chatLimits.maxMessages + 2)
  const result = await guardChatRequest(chatRequest({ messages }))
  assert.equal(result.ok, true)
  assert.deepEqual(result.messages, messages.slice(-chatLimits.maxMessages))
})

test('drops all leading non-user messages even below the limit', async () => {
  const messages = [
    { ...question, id: 'old-answer', role: 'assistant' },
    { ...question, id: 'old-follow-up', role: 'assistant' },
    ...alternatingMessages(3),
  ]
  const result = await guardChatRequest(chatRequest({ messages }))
  assert.equal(result.ok, true)
  assert.deepEqual(result.messages, messages.slice(2))
})

test('rejects a window without a user instead of forwarding an invalid history', async () => {
  const answers = alternatingMessages(chatLimits.maxMessages).map(
    (message) => ({
      ...message,
      role: 'assistant',
    }),
  )
  for (const messages of [[], answers, [question, ...answers]]) {
    const result = await guardChatRequest(chatRequest({ messages }))
    assert.equal(result.ok, false)
    assert.equal(result.status, 400)
  }
})

test('drops orphaned tool responses and preserves later tool exchanges', async () => {
  const exchange = [
    {
      ...question,
      id: 'checkout-question',
      content: 'Bestellung abschliessen',
    },
    {
      role: 'assistant',
      content: '',
      toolCalls: [
        {
          id: 'checkout-call',
          type: 'function',
          function: { name: 'checkout', arguments: '{}' },
        },
      ],
    },
    { role: 'tool', toolCallId: 'checkout-call', content: '{"ok":true}' },
  ]
  const messages = [
    ...alternatingMessages(chatLimits.maxMessages - exchange.length),
    { role: 'tool', toolCallId: 'old-call', content: '{"ok":true}' },
    ...exchange,
  ]
  const result = await guardChatRequest(chatRequest({ messages }))
  assert.equal(result.ok, true)
  assert.equal(result.messages[0].role, 'user')
  assert.deepEqual(result.messages.slice(-exchange.length), exchange)

  const orphaned = await guardChatRequest(
    chatRequest({
      messages: [
        messages[chatLimits.maxMessages - exchange.length],
        ...exchange,
      ],
    }),
  )
  assert.equal(orphaned.ok, true)
  assert.deepEqual(orphaned.messages, exchange)
})
