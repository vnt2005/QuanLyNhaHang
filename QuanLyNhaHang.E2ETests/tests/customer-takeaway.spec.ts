import { expect, test } from './fixtures'
import { bearerHeaders, loginAsAdmin } from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')
const customerURL = (process.env.E2E_CUSTOMER_BASE_URL ?? 'http://localhost:5174').replace(/\/$/, '')

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

test('CustomerWeb: mở chi tiết món, thêm giỏ và đặt mang về không cần bàn/QR', async ({ page, request }) => {
  const id = suffix()
  const categoryName = `Danh mục Takeaway E2E ${id}`
  const itemName = `Món Takeaway E2E ${id}`
  const customerName = `Khách Takeaway ${id}`
  const phoneNumber = `09${id.slice(-8).padStart(8, '0')}`

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const categoryResponse = await request.post(`${apiURL}/api/MenuCategories`, {
    headers,
    data: {
      name: categoryName,
      description: 'Danh mục kiểm thử đặt món mang về.',
      displayOrder: 150,
    },
  })
  expect(categoryResponse.ok()).toBeTruthy()
  const category = await categoryResponse.json() as { id: string }

  const menuResponse = await request.post(`${apiURL}/api/MenuItems`, {
    headers,
    data: {
      menuCategoryId: category.id,
      name: itemName,
      description: 'Món dùng để kiểm thử click chi tiết và giỏ mang về.',
      price: 135000,
      imageUrl: null,
    },
  })
  expect(menuResponse.ok()).toBeTruthy()
  const menuItem = await menuResponse.json() as { id: string }

  await page.goto(`${customerURL}/menu`)
  await page.getByPlaceholder('Tìm món bạn thích').fill(itemName)

  const card = page.locator('.menu-card-button').filter({ hasText: itemName })
  await expect(card).toBeVisible()
  await card.click()

  await expect(page).toHaveURL(new RegExp(`/menu/${menuItem.id}$`))
  await expect(page.getByRole('heading', { name: itemName, exact: true })).toBeVisible()
  await expect(page.getByText('Đặt món mang về', { exact: true })).toBeVisible()
  await expect(page.getByText('Đơn mang về không cần QR.', { exact: false })).toBeVisible()

  await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click()
  await expect(page.getByText(`Đã thêm 1 phần ${itemName} vào giỏ mang về.`, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Xem giỏ', exact: true }).click()

  await expect(page).toHaveURL(`${customerURL}/takeaway`)
  await expect(page.locator('.takeaway-lines').filter({ hasText: itemName })).toBeVisible()
  await page.getByLabel('Người nhận', { exact: true }).fill(customerName)
  await page.getByLabel('Số điện thoại', { exact: true }).fill(phoneNumber)
  await page.getByLabel('Ghi chú', { exact: true }).fill('Không hành, mang về.')

  const createResponsePromise = page.waitForResponse(response => (
    response.url().endsWith('/api/customer-site/takeaway-orders')
    && response.request().method() === 'POST'
  ))
  await page.getByRole('button', { name: 'Xác nhận đặt mang về', exact: true }).click()
  const createResponse = await createResponsePromise
  expect(createResponse.status()).toBe(200)

  const payload = await createResponse.json() as {
    data: {
      id: string
      orderCode: string
      orderType: string
      restaurantTableId: string | null
      restaurantTableName: string
    }
  }
  expect(payload.data.orderType).toBe('Takeaway')
  expect(payload.data.restaurantTableId).toBeNull()
  expect(payload.data.restaurantTableName).toBe('Mang về')

  await expect(page.getByRole('heading', { name: 'Đã nhận đơn mang về', exact: true })).toBeVisible()
  await expect(page.getByText(payload.data.orderCode, { exact: false })).toBeVisible()

  const adminOrderResponse = await request.get(`${apiURL}/api/Orders/${payload.data.id}`, { headers })
  expect(adminOrderResponse.ok()).toBeTruthy()
  const adminOrder = await adminOrderResponse.json() as {
    orderType: string
    restaurantTableId: string | null
    restaurantTableName: string
    customerName: string
  }
  expect(adminOrder.orderType).toBe('Takeaway')
  expect(adminOrder.restaurantTableId).toBeNull()
  expect(adminOrder.restaurantTableName).toBe('Mang về')
  expect(adminOrder.customerName).toBe(customerName)

  const kitchenResponse = await request.get(`${apiURL}/api/kitchen/orders`, { headers })
  expect(kitchenResponse.ok()).toBeTruthy()
  const kitchenOrders = await kitchenResponse.json() as Array<{
    orderId: string
    orderType: string
    restaurantTableName: string
  }>
  const kitchenOrder = kitchenOrders.find(order => order.orderId === payload.data.id)
  expect(kitchenOrder).toBeTruthy()
  expect(kitchenOrder?.orderType).toBe('Takeaway')
  expect(kitchenOrder?.restaurantTableName).toBe('Mang về')
})
