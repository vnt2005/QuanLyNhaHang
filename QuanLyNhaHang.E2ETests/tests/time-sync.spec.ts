import { expect, test } from './fixtures'
import {
  bearerHeaders,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

function vietnamFutureDateTime() {
  const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  date.setHours(19, 15, 0, 0)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

test('Thời gian: đặt bàn giữ nguyên giờ Việt Nam qua UI và API', async ({ page, request }) => {
  const id = suffix()
  const areaName = `Khu thời gian E2E ${id}`
  const tableName = `Bàn thời gian E2E ${id}`
  const customerName = `Khách thời gian E2E ${id}`
  const localDateTime = vietnamFutureDateTime()
  const localDate = localDateTime.slice(0, 10)
  const expectedUtc = new Date(`${localDateTime}:00+07:00`).toISOString()

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: { name: areaName, description: 'Kiểm tra đồng bộ múi giờ.' },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }

  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers,
    data: { areaId: area.id, name: tableName, capacity: 4, note: null },
  })
  expect(tableResponse.ok()).toBeTruthy()

  await openAdminModule(page, 'Đặt bàn')
  await page.getByRole('button', { name: '+ Tạo đặt bàn', exact: true }).click()

  const modal = page.locator('.reservations-modal')
  await modal.locator('select').first()
    .selectOption({ label: `${tableName} • ${areaName} • 4 chỗ` })
  await modal.getByLabel('Thời gian', { exact: true }).fill(localDateTime)
  await modal.getByLabel('Tên khách', { exact: true }).fill(customerName)
  await modal.getByLabel('Số điện thoại', { exact: true })
    .fill(`03${id.slice(-8).padStart(8, '0')}`)
  await modal.getByLabel('Số khách', { exact: true }).fill('2')

  const createResponsePromise = page.waitForResponse(response => (
    response.url().endsWith('/api/reservations')
    && response.request().method() === 'POST'
  ))

  await modal.getByRole('button', {
    name: /Tạo đặt bàn|Lưu đặt bàn|Đang lưu/,
  }).click()

  const createResponse = await createResponsePromise
  expect(createResponse.status()).toBe(200)
  const envelope = await createResponse.json() as {
    data: {
      id: string
      reservationTime: string
      createdAt: string
    }
  }

  expect(envelope.data.reservationTime).toBe(expectedUtc)
  expect(envelope.data.reservationTime).toMatch(/Z$/)
  expect(envelope.data.createdAt).toMatch(/Z$/)

  const filteredResponse = await request.get(
    `${apiURL}/api/reservations/paginated?fromDate=${localDate}&toDate=${localDate}&pageNumber=1&pageSize=100`,
    { headers },
  )
  expect(filteredResponse.ok()).toBeTruthy()
  const filteredResult = await filteredResponse.json() as {
    items: Array<{ id: string }>
  }
  expect(filteredResult.items.map(item => item.id)).toContain(envelope.data.id)

  const expectedDisplay = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(expectedUtc))

  const row = page.locator('.reservations-table tbody tr')
    .filter({ hasText: customerName })
  await expect(row).toBeVisible()
  await expect(row).toContainText(expectedDisplay)

  await row.getByRole('button', { name: 'Sửa', exact: true }).click()
  await expect(page.locator('.reservations-modal')
    .getByLabel('Thời gian', { exact: true }))
    .toHaveValue(localDateTime)
})
