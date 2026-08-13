import { expect, test } from './fixtures'
import {
  bearerHeaders,
  loginAsAdmin,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')
const customerURL = (process.env.E2E_CUSTOMER_BASE_URL ?? 'http://localhost:5174')
  .replace(/\/$/, '')

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

test('QR gọi món thật: quét mã, chọn món và theo dõi đơn', async ({ page, request }) => {
  const id = suffix()
  const areaName = `Khu gọi món thật E2E ${id}`
  const tableName = `Bàn gọi món thật E2E ${id}`
  const categoryName = `Danh mục gọi món E2E ${id}`
  const menuItemName = `Món gọi thật E2E ${id}`

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: { name: areaName, description: 'Khu kiểm tra QR gọi món thật.' },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }

  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers,
    data: { areaId: area.id, name: tableName, capacity: 4, note: 'Bàn QR thật.' },
  })
  expect(tableResponse.ok()).toBeTruthy()
  const table = await tableResponse.json() as { id: string }

  const categoryResponse = await request.post(`${apiURL}/api/MenuCategories`, {
    headers,
    data: {
      name: categoryName,
      description: 'Danh mục hiển thị công khai.',
      displayOrder: 1,
    },
  })
  expect(categoryResponse.ok()).toBeTruthy()
  const category = await categoryResponse.json() as { id: string }

  const menuResponse = await request.post(`${apiURL}/api/MenuItems`, {
    headers,
    data: {
      menuCategoryId: category.id,
      name: menuItemName,
      description: 'Món được chọn trực tiếp từ trang QR.',
      price: 125000,
      imageUrl: null,
    },
  })
  expect(menuResponse.ok()).toBeTruthy()

  const qrResponse = await request.post(`${apiURL}/api/table-qr-codes`, {
    headers,
    data: {
      restaurantTableId: table.id,
      clientBaseUrl: customerURL,
      note: `QR gọi món thật ${id}`,
    },
  })
  expect(qrResponse.ok()).toBeTruthy()
  const qr = await qrResponse.json() as {
    data: { token: string; qrCodeUrl: string }
  }

  await page.goto(`${customerURL}/qr-order/${encodeURIComponent(qr.data.token)}`)

  await expect(page.getByRole('heading', {
    name: `Gọi món tại ${tableName}`,
  })).toBeVisible()
  await expect(page.getByText(categoryName, { exact: true }).first()).toBeVisible()

  const menuCard = page.locator('.qr-menu-item').filter({ hasText: menuItemName })
  await expect(menuCard).toBeVisible()
  await expect(menuCard).toContainText('125.000')
  await menuCard.getByRole('button', { name: `Thêm ${menuItemName}` }).click()

  const cart = page.locator('.qr-cart-panel')
  await expect(cart).toContainText(menuItemName)
  await expect(cart).toContainText('125.000')
  await cart.getByPlaceholder('Ví dụ: lên món cùng lúc…')
    .fill('Không hành, kiểm thử Playwright.')
  await cart.getByRole('button', { name: 'Xác nhận gọi món', exact: true }).click()

  const tracking = page.locator('.current-order-view')
  await expect(tracking).toBeVisible()
  await expect(tracking).toContainText('ORD-')
  await expect(tracking).toContainText('Đã tiếp nhận')
  await expect(tracking).toContainText(menuItemName)
  await expect(tracking).toContainText('125.000')

  await page.reload()
  await expect(page.locator('.current-order-view')).toBeVisible()
  await expect(page.locator('.current-order-view')).toContainText('Đã tiếp nhận')
  await expect(page.locator('.current-order-view')).toContainText(menuItemName)
})
