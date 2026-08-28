import { expect, test } from '@playwright/test'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')
const customerURL = (
  process.env.E2E_CUSTOMER_BASE_URL ?? 'http://localhost:5174'
).replace(/\/$/, '')

const cartKey = 'customerTakeawayCart:v1'

async function mockBootstrap(page: import('@playwright/test').Page) {
  await page.route(`${apiURL}/api/customer-site/bootstrap`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      restaurant: {
        restaurantName: 'VNT',
        address: 'Nha Trang',
        phoneNumber: '0328636341',
        currency: 'VND',
        openingTime: '07:00',
        closingTime: '23:00',
      },
      menuCategories: [
        { id: 'cat-1', name: 'Món phụ', displayOrder: 1 },
      ],
      menuItems: [
        {
          id: 'menu-1',
          menuCategoryId: 'cat-1',
          menuCategoryName: 'Món phụ',
          name: 'Vi Cá Mập',
          price: 10000,
          isAvailable: true,
        },
      ],
      reservationTables: [],
    }),
  }))
}

test('CustomerWeb: giỏ localStorage cũ bị xóa và không xuất hiện ở phiên mới', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, JSON.stringify({ 'menu-1': 1 }))
  }, cartKey)
  await mockBootstrap(page)

  await page.goto(`${customerURL}/takeaway`)

  await expect(page.getByRole('heading', { name: 'Giỏ mang về đang trống' }))
    .toBeVisible()
  expect(await page.evaluate(key => localStorage.getItem(key), cartKey)).toBeNull()
  expect(await page.evaluate(key => sessionStorage.getItem(key), cartKey)).toBeNull()
})

test('CustomerWeb: giỏ chỉ tồn tại trong tab hiện tại và vẫn giữ khi F5', async ({ context, page }) => {
  await page.addInitScript(key => {
    sessionStorage.setItem(key, JSON.stringify({ 'menu-1': 1 }))
  }, cartKey)
  await mockBootstrap(page)

  await page.goto(`${customerURL}/takeaway`)
  await expect(page.getByText('Vi Cá Mập', { exact: true }).first()).toBeVisible()

  await page.reload()
  await expect(page.getByText('Vi Cá Mập', { exact: true }).first()).toBeVisible()
  expect(await page.evaluate(key => sessionStorage.getItem(key), cartKey))
    .toContain('menu-1')

  const newTab = await context.newPage()
  await mockBootstrap(newTab)
  await newTab.goto(`${customerURL}/takeaway`)

  await expect(newTab.getByRole('heading', { name: 'Giỏ mang về đang trống' }))
    .toBeVisible()
  expect(await newTab.evaluate(key => sessionStorage.getItem(key), cartKey)).toBeNull()
})
