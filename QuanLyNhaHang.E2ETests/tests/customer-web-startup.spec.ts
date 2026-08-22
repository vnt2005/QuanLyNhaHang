import { expect, test } from '@playwright/test'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')
const customerURL = (
  process.env.E2E_CUSTOMER_BASE_URL ?? 'http://localhost:5174'
).replace(/\/$/, '')
const customerOrigin = new URL(customerURL).origin

const bootstrap = {
  restaurant: {
    restaurantName: 'Nhà Hàng E2E',
    address: '1 Nguyễn Huệ',
    phoneNumber: '0900000000',
    email: null,
    logoUrl: null,
    currency: 'VND',
    openingTime: '08:00',
    closingTime: '22:00',
    welcomeMessage: 'Chào mừng khách E2E.',
  },
  menuCategories: [],
  menuItems: [],
  reservationTables: [],
}

test('CustomerWeb: mở ở đầu trang và không còn lỗi favicon 404', async ({ page, request }) => {
  const failedStaticRequests: string[] = []

  page.on('response', response => {
    const url = new URL(response.url())
    if (url.origin === customerOrigin && response.status() >= 400) {
      failedStaticRequests.push(`${response.status()} ${url.pathname}`)
    }
  })

  await page.route(`${apiURL}/api/customer-site/bootstrap`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(bootstrap),
  }))

  await page.goto(`${customerURL}/`)
  await expect(page.getByRole('heading', {
    name: 'Trọn vị Việt trong từng khoảnh khắc',
  })).toBeVisible()

  const faviconLink = page.locator('link[rel~="icon"]')
  await expect(faviconLink).toHaveAttribute('href', '/favicon.svg')

  const favicon = await request.get(`${customerURL}/favicon.svg`)
  expect(favicon.ok()).toBeTruthy()
  expect(favicon.headers()['content-type']).toContain('image/svg+xml')

  await page.evaluate(() => window.scrollTo(0, 600))
  await expect.poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)

  await page.reload()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
  expect(failedStaticRequests).toEqual([])
})
