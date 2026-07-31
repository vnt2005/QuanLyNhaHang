import { expect, test } from './fixtures'
import {
  bearerHeaders,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

function idSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

function futureDateTime(days: number) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  date.setHours(19, 0, 0, 0)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

test('Đặt bàn: tạo, xem chi tiết, sửa và đi hết vòng đời trạng thái', async ({ page, request }) => {
  const id = idSuffix()
  const areaName = `Khu đặt bàn E2E ${id}`
  const tableName = `Bàn đặt E2E ${id}`
  const customerName = `Khách đặt E2E ${id}`
  const updatedCustomerName = `${customerName} đã sửa`

  const session = await loginAsAdmin(page)
  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers: bearerHeaders(session),
    data: { name: areaName, description: 'Khu vực cho reservation E2E.' },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }

  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers: bearerHeaders(session),
    data: { areaId: area.id, name: tableName, capacity: 6, note: 'Bàn reservation E2E.' },
  })
  expect(tableResponse.ok()).toBeTruthy()

  await openAdminModule(page, 'Đặt bàn')
  await page.getByRole('button', { name: '+ Tạo đặt bàn', exact: true }).click()

  let modal = page.locator('.reservations-modal')
  await modal.locator('select').first()
    .selectOption({ label: `${tableName} • ${areaName} • 6 chỗ` })
  await modal.getByLabel('Thời gian', { exact: true }).fill(futureDateTime(2))
  await modal.getByLabel('Tên khách', { exact: true }).fill(customerName)
  await modal.getByLabel('Số điện thoại', { exact: true }).fill(`05${id.slice(-8).padStart(8, '0')}`)
  await modal.getByLabel('Email', { exact: true }).fill(`reservation-${id}@example.com`)
  await modal.getByLabel('Số khách', { exact: true }).fill('4')
  await modal.getByLabel('Tiền cọc', { exact: true }).fill('200000')
  await modal.locator('textarea').fill('Đặt bàn bằng Playwright.')
  await modal.getByRole('button', { name: /Tạo đặt bàn|Lưu đặt bàn|Đang lưu/ }).click()

  let row = page.locator('.reservations-table tbody tr').filter({ hasText: customerName })
  await expect(row).toBeVisible()
  await expect(row).toContainText(tableName)
  await expect(row).toContainText('4 người')
  await expect(row).toContainText('200.000')
  await expect(row).toContainText('Chờ xác nhận')

  await row.locator('.reservation-name').click()
  await expect(page.getByText('CHI TIẾT ĐẶT BÀN', { exact: true })).toBeVisible()
  await expect(page.getByText(customerName, { exact: true }).last()).toBeVisible()
  await expect(page.getByText(tableName, { exact: true }).last()).toBeVisible()
  await page.getByRole('button', { name: 'Đóng', exact: true }).last().click()
  await expect(page.getByText('CHI TIẾT ĐẶT BÀN', { exact: true })).toHaveCount(0)

  row = page.locator('.reservations-table tbody tr').filter({ hasText: customerName })
  await row.getByRole('button', { name: 'Sửa', exact: true }).click()
  modal = page.locator('.reservations-modal')
  await modal.getByLabel('Tên khách', { exact: true }).fill(updatedCustomerName)
  await modal.getByLabel('Số khách', { exact: true }).fill('5')
  await modal.getByLabel('Tiền cọc', { exact: true }).fill('300000')
  await modal.locator('textarea').fill('Đặt bàn E2E đã sửa.')
  await modal.getByRole('button', { name: /Cập nhật|Lưu/ }).last().click()

  row = page.locator('.reservations-table tbody tr').filter({ hasText: updatedCustomerName })
  await expect(row).toBeVisible()
  await expect(row).toContainText('5 người')
  await expect(row).toContainText('300.000')

  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Xác nhận', exact: true }).click()
  row = page.locator('.reservations-table tbody tr').filter({ hasText: updatedCustomerName })
  await expect(row).toContainText('Đã xác nhận')

  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Nhận bàn', exact: true }).click()
  row = page.locator('.reservations-table tbody tr').filter({ hasText: updatedCustomerName })
  await expect(row).toContainText('Đã nhận bàn')

  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Hoàn tất', exact: true }).click()
  await expect(page.locator('.reservations-table tbody tr').filter({ hasText: updatedCustomerName }))
    .toContainText('Hoàn tất')
})

test('Đặt bàn: hủy lịch đang chờ xác nhận', async ({ page, request }) => {
  const id = idSuffix()
  const areaName = `Khu hủy E2E ${id}`
  const tableName = `Bàn hủy E2E ${id}`
  const customerName = `Khách hủy E2E ${id}`

  const session = await loginAsAdmin(page)
  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers: bearerHeaders(session),
    data: { name: areaName, description: null },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }
  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers: bearerHeaders(session),
    data: { areaId: area.id, name: tableName, capacity: 4, note: null },
  })
  expect(tableResponse.ok()).toBeTruthy()

  await openAdminModule(page, 'Đặt bàn')
  await page.getByRole('button', { name: '+ Tạo đặt bàn', exact: true }).click()
  const modal = page.locator('.reservations-modal')
  await modal.locator('select').first()
    .selectOption({ label: `${tableName} • ${areaName} • 4 chỗ` })
  await modal.getByLabel('Thời gian', { exact: true }).fill(futureDateTime(3))
  await modal.getByLabel('Tên khách', { exact: true }).fill(customerName)
  await modal.getByLabel('Số điện thoại', { exact: true }).fill(`04${id.slice(-8).padStart(8, '0')}`)
  await modal.getByLabel('Số khách', { exact: true }).fill('2')
  await modal.getByRole('button', { name: /Tạo đặt bàn|Lưu đặt bàn|Đang lưu/ }).click()

  let row = page.locator('.reservations-table tbody tr').filter({ hasText: customerName })
  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Hủy', exact: true }).click()
  row = page.locator('.reservations-table tbody tr').filter({ hasText: customerName })
  await expect(row).toContainText('Đã hủy')
})
