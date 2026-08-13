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
  const areaName = `Khu thông báo E2E ${id}`
  const tableName = `Bàn thông báo E2E ${id}`
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

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: {
      name: areaName,
      description: 'Dữ liệu nền cho kiểm thử thông báo realtime.',
    },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }

  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers,
    data: {
      areaId: area.id,
      name: tableName,
      capacity: 6,
      note: 'Bàn dùng cho kiểm thử thông báo realtime.',
    },
  })
  expect(tableResponse.ok()).toBeTruthy()
  const table = await tableResponse.json() as { id: string }

  // This is the production CustomerWeb reservation route. It is intentionally
  // anonymous; the server marks the command as a customer request itself.
  const reservationResponse = await request.post(`${apiURL}/api/customer-site/reservations`, {
    data: {
      restaurantTableId: table.id,
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
