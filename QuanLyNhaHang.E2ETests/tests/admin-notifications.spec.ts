import { expect, test } from './fixtures'
import {
  bearerHeaders,
  loginAsAdmin,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

function futureIso(days: number) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  value.setHours(19, 0, 0, 0)
  return value.toISOString()
}

test('Thông báo Admin: yêu cầu đặt bàn từ khách xuất hiện realtime và mở đúng màn hình', async ({ page, request }) => {
  const id = suffix()
  const customerName = `Khách realtime E2E ${id}`

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const readAllResponse = await request.patch(`${apiURL}/api/notifications/read-all`, {
    headers,
  })
  expect(readAllResponse.ok()).toBeTruthy()

  await page.reload()
  await expect(page.locator('.admin-layout')).toBeVisible()

  const notificationTrigger = page.locator('.notification-trigger')
  await expect(notificationTrigger).toBeVisible()
  await expect(notificationTrigger).toHaveAttribute('aria-label', 'Mở thông báo')
  await notificationTrigger.click()

  const panel = page.locator('#admin-notification-panel')
  await expect(panel).toBeVisible()
  await expect(panel.locator('.notification-realtime')).toContainText(
    'Đang nhận thông báo theo thời gian thực',
    { timeout: 20_000 },
  )

  // Lấy bàn đang hoạt động qua đúng API public mà CustomerWeb sử dụng.
  // Test notification không nên phụ thuộc vào quyền TablesManage chỉ để tạo fixture.
  const bootstrapResponse = await request.get(`${apiURL}/api/customer-site/bootstrap`)
  expect(bootstrapResponse.ok()).toBeTruthy()

  const bootstrap = await bootstrapResponse.json() as {
    reservationTables: Array<{
      id: string
      name: string
      capacity: number
    }>
  }
  const table = bootstrap.reservationTables.find(item => item.capacity >= 4)
  expect(
    table,
    'E2E seed phải có ít nhất một bàn đang hoạt động với sức chứa từ 4 khách.',
  ).toBeTruthy()

  const tableName = table!.name

  // Đây là route production của CustomerWeb. Route cố ý anonymous và backend
  // tự đánh dấu command là customer request để phát thông báo cho Admin.
  const reservationResponse = await request.post(`${apiURL}/api/customer-site/reservations`, {
    data: {
      restaurantTableId: table!.id,
      customerName,
      phoneNumber: `09${id.slice(-8).padStart(8, '0')}`,
      email: `notification-${id}@example.com`,
      numberOfGuests: 4,
      reservationTime: futureIso(2),
      note: 'Yêu cầu đặt bàn từ khách để kiểm tra realtime.',
    },
  })
  expect(reservationResponse.ok()).toBeTruthy()

  const toast = page.locator('.notification-toast')
  await expect(toast).toBeVisible({ timeout: 12_000 })
  await expect(toast).toContainText('Yêu cầu đặt bàn mới')
  await expect(toast).toContainText(customerName)
  await expect(toast).toContainText(tableName)

  await expect(notificationTrigger).toHaveAttribute(
    'aria-label',
    'Mở thông báo, 1 chưa đọc',
  )

  const notificationItem = panel
    .locator('.notification-item')
    .filter({ hasText: customerName })
  await expect(notificationItem).toBeVisible()
  await expect(notificationItem).toContainText('Yêu cầu đặt bàn mới')
  await expect(notificationItem.locator('[aria-label="Chưa đọc"]')).toBeVisible()

  await notificationItem.click()

  await expect(panel).toHaveCount(0)
  await expect(
    page.locator('.topbar').getByRole('heading', {
      name: 'Đặt bàn',
      exact: true,
    }),
  ).toBeVisible()
  await expect(notificationTrigger).toHaveAttribute('aria-label', 'Mở thông báo')

  const unreadResponse = await request.get(
    `${apiURL}/api/notifications?limit=20&unreadOnly=true`,
    { headers },
  )
  expect(unreadResponse.ok()).toBeTruthy()
  const unreadFeed = await unreadResponse.json() as {
    items: Array<{ id: string }>
    unreadCount: number
  }
  expect(unreadFeed.unreadCount).toBe(0)
  expect(unreadFeed.items).toEqual([])
})
