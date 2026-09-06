import { expect, test } from '@playwright/test'

const article = {
  articleNumber: '022600',
  description: 'Test Vollmilch',
  price: 1.29,
  celumId: null,
  brand: 'Test',
  unitText: '1 l',
  sellAmount: 1,
  sellUnit: 'St',
}
const result = {
  ok: true,
  searchTerm: 'Milch',
  totalCount: 1,
  shownCount: 1,
  articles: [article],
}
const cart = {
  ok: true,
  cartId: 'test-cart',
  items: [{ ...article, quantity: 2, lineTotal: 2.58 }],
  totalItems: 2,
  totalAmount: 2.58,
}

for (const mode of ['assistant', 'workspace'] as const) {
  test(`${mode} renders AG-UI text and search in the intended surface`, async ({
    page,
  }) => {
    let posts = 0
    let addCalls = 0
    let checkoutCalls = 0
    await page.route('**/api/chat', async (route) => {
      posts++
      expect(route.request().postDataJSON().forwardedProps.mode).toBe(mode)
      const chunks = [
        { type: 'RUN_STARTED', threadId: 'thread', runId: 'run' },
        { type: 'TEXT_MESSAGE_START', messageId: 'answer', role: 'assistant' },
        {
          type: 'TEXT_MESSAGE_CONTENT',
          messageId: 'answer',
          delta: 'Welche Milch wünschen Sie?',
        },
        { type: 'TEXT_MESSAGE_END', messageId: 'answer' },
        {
          type: 'TOOL_CALL_START',
          toolCallId: 'search',
          toolCallName: 'searchProducts',
          parentMessageId: 'answer',
        },
        {
          type: 'TOOL_CALL_ARGS',
          toolCallId: 'search',
          delta: JSON.stringify({ term: 'Milch' }),
        },
        { type: 'TOOL_CALL_END', toolCallId: 'search' },
        {
          type: 'TOOL_CALL_RESULT',
          toolCallId: 'search',
          messageId: 'search-result',
          content: JSON.stringify(result),
          role: 'tool',
        },
        {
          type: 'TOOL_CALL_START',
          toolCallId: 'cart',
          toolCallName: 'getCart',
          parentMessageId: 'answer',
        },
        { type: 'TOOL_CALL_ARGS', toolCallId: 'cart', delta: '{}' },
        { type: 'TOOL_CALL_END', toolCallId: 'cart' },
        {
          type: 'TOOL_CALL_RESULT',
          toolCallId: 'cart',
          messageId: 'cart-result',
          content: JSON.stringify(cart),
          role: 'tool',
        },
        {
          type: 'RUN_FINISHED',
          threadId: 'thread',
          runId: 'run',
          finishReason: 'stop',
        },
      ]
      await route.fulfill({
        contentType: 'text/event-stream',
        body: chunks
          .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
          .join(''),
      })
    })
    await page.route('**/api/cart/items', async (route) => {
      addCalls++
      expect(route.request().postDataJSON()).toEqual({
        articleNumber: '022600',
        quantity: 1,
      })
      await route.fulfill({ json: cart })
    })
    await page.route('**/api/cart/checkout', async (route) => {
      checkoutCalls++
      await route.fulfill({
        json: { orderId: 'order-tanstack', totalItems: 2, totalAmount: 2.58 },
      })
    })
    const hydrated = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/session') &&
        response.request().method() === 'GET',
    )
    await page.goto(mode === 'workspace' ? '/chat' : '/')
    await hydrated
    if (mode === 'assistant')
      await page.getByRole('button', { name: 'Chatbot öffnen' }).click()
    const input = page.getByRole('textbox', { name: 'Nachricht eingeben' })
    await input.fill('Suche Milch')
    await input.press('Enter')
    const chat = page.getByRole('region', { name: 'Chatbot' })
    await expect(chat).toContainText('Welche Milch wünschen Sie?')
    if (mode === 'workspace') {
      await expect(chat.locator('.chatbot-product-card')).toContainText(
        'Test Vollmilch',
      )
      await chat.getByRole('button', { name: 'In den Warenkorb' }).click()
      await expect(chat).toContainText(
        'Artikel 022600 über den Button in den Warenkorb gelegt.',
      )
      expect(addCalls).toBe(1)
      if (process.env.EXERCISE_COMPLETE) {
        await chat
          .getByRole('button', { name: 'Bestellen', exact: true })
          .click()
        await expect(chat).toContainText('Bestellung order-tanstack')
        expect(checkoutCalls).toBe(1)
      }
      expect(posts).toBe(1)
    } else {
      await expect(chat.locator('.chatbot-product-card')).toHaveCount(0)
      await expect(page.locator('input[name="query"]')).toHaveValue('Milch')
    }
  })
}
