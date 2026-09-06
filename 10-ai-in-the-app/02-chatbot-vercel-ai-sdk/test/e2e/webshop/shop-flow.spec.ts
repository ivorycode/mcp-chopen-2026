import { expect, test } from '@playwright/test'

test('search, quantity, removal and checkout update the actual shop and order history', async ({
  page,
}) => {
  await page.request.post('/api/session', {
    data: { loginId: 'restaurant-baeren' },
  })
  await page.request.delete('/api/cart')
  await page.goto('/')
  // Konto-Daten werden erst nach der Hydration geladen.
  await expect(
    page.getByRole('button', { name: 'Konto wechseln', exact: true }),
  ).toBeVisible()
  await page.locator('input[name="query"]').fill('Milch')
  await page
    .getByRole('button', { name: 'Artikel suchen', exact: true })
    .click()
  const add = page
    .getByRole('button', { name: 'In den Warenkorb', exact: true })
    .first()
  await add.click()
  const cart = page.locator('#cart')
  await expect(cart.locator('article')).toHaveCount(1)
  await cart.getByRole('button', { name: '+', exact: true }).click()
  await expect
    .poll(
      async () =>
        (await (await page.request.get('/api/cart')).json()).totalItems,
    )
    .toBe(2)
  await cart.getByRole('button', { name: 'Entfernen', exact: true }).click()
  await expect(cart.locator('article')).toHaveCount(0)
  await add.click()
  await expect(cart.locator('article')).toHaveCount(1)
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/cart/checkout') && r.request().method() === 'POST',
  )
  await cart
    .getByRole('button', { name: 'Warenkorb senden', exact: true })
    .click()
  const order = await (await response).json()
  expect(order.orderId).toBeTruthy()
  await expect(page.getByText(order.orderId, { exact: true })).toBeVisible()
  await expect(cart.locator('article')).toHaveCount(0)
})
