import { expect, test } from './fixtures'
import {
  acceptConfirmDialog,
  bearerHeaders,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')
const frontendURL = (process.env.E2E_BASE_URL ?? 'http://localhost:5173')
  .replace(/\/$/, '')

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

type TableQrResponse = {
  data: {
    token: string
  }
}

test('QR bàn: tạo, tải ảnh, kiểm tra gọi món thật, sửa, khóa, tạo lại và vô hiệu', async ({ page, request }) => {
  const id = suffix()
  const areaName = `Khu QR E2E ${id}`
  const tableName = `Bàn QR E2E ${id}`
  const menuItemName = `Món QR E2E ${id}`
  const note = `QR Playwright ${id}`
  const updatedNote = `${note} đã sửa`

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: { name: areaName, description: 'Khu QR Playwright.' },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }
  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers,
    data: { areaId: area.id, name: tableName, capacity: 4, note: 'Bàn QR.' },
  })
  expect(tableResponse.ok()).toBeTruthy()
  const table = await tableResponse.json() as { id: string }

  const categoryResponse = await request.post(`${apiURL}/api/MenuCategories`, {
    headers,
    data: { name: `Danh mục QR ${id}`, description: null, displayOrder: 101 },
  })
  expect(categoryResponse.ok()).toBeTruthy()
  const category = await categoryResponse.json() as { id: string }
  const menuResponse = await request.post(`${apiURL}/api/MenuItems`, {
    headers,
    data: {
      menuCategoryId: category.id,
      name: menuItemName,
      description: 'Món hiển thị trên trang gọi món QR thật.',
      price: 90000,
      imageUrl: null,
    },
  })
  expect(menuResponse.ok()).toBeTruthy()

  const qrResponse = await request.post(`${apiURL}/api/table-qr-codes`, {
    headers,
    data: {
      restaurantTableId: table.id,
      clientBaseUrl: frontendURL,
      note,
    },
  })
  expect(qrResponse.ok()).toBeTruthy()
  const createdQr = await qrResponse.json() as TableQrResponse
  const originalToken = createdQr.data.token
  expect(originalToken).not.toBe('')

  const publicMenuResponse = await request.get(
    `${apiURL}/api/qr-order/${encodeURIComponent(originalToken)}/menu-items`,
  )
  expect(publicMenuResponse.ok()).toBeTruthy()
  const publicMenuItems = await publicMenuResponse.json() as Array<{
    name: string
    menuCategoryName: string
    description?: string | null
  }>
  const createdMenuItem = publicMenuItems.find(item => item.name === menuItemName)
  expect(createdMenuItem).toBeTruthy()
  expect(createdMenuItem?.menuCategoryName).toBe(`Danh mục QR ${id}`)
  expect(createdMenuItem?.description).toContain('QR thật')

  await openAdminModule(page, 'QR bàn')
  const clientUrl = page.getByPlaceholder('https://order.example.com')
  await clientUrl.fill(frontendURL)
  await page.getByRole('button', { name: 'Lưu địa chỉ', exact: true }).click()
  await expect(page.getByText('Đã lưu địa chỉ ứng dụng gọi món trên trình duyệt này.', { exact: true }))
    .toBeVisible()

  const keyword = page.getByPlaceholder('Tìm theo bàn, token hoặc liên kết…')
  await keyword.fill(tableName)
  await page.getByRole('button', { name: 'Lọc', exact: true }).click()

  let card = page.locator('.table-qr-card').filter({ hasText: tableName })
  await expect(card).toBeVisible()
  await expect(card).toContainText(note)
  await card.getByRole('button', { name: 'Chi tiết', exact: true }).click()

  let detail = page.locator('.table-qr-detail-modal')
  await expect(detail).toBeVisible()
  await expect(detail).toContainText(tableName)
  await expect(detail).toContainText(note)
  await expect(detail.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/)
  await expect(detail.locator('code').first()).toHaveText(originalToken)

  const downloadPromise = page.waitForEvent('download')
  await detail.getByRole('button', { name: 'Tải ảnh PNG', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.png$/)

  await detail.getByRole('button', { name: 'Kiểm tra gọi món thật', exact: true }).click()
  const livePreview = page.locator('.table-qr-live-modal')
  await expect(livePreview).toBeVisible()
  const liveFrame = page.frameLocator('.table-qr-live-frame')
  await expect(liveFrame.getByRole('heading', {
    name: 'Chọn món, kiểm tra giỏ và xác nhận',
  })).toBeVisible()
  await expect(liveFrame.getByText(tableName, { exact: true }).first()).toBeVisible()
  await expect(liveFrame.getByText(menuItemName, { exact: true })).toBeVisible()
  await livePreview
    .locator('.table-qr-live-actions')
    .getByRole('button', { name: 'Đóng', exact: true })
    .click()
  await expect(livePreview).toHaveCount(0)

  detail = page.locator('.table-qr-detail-modal')
  await detail.getByRole('button', { name: 'Sửa ghi chú', exact: true }).click()
  const modal = page.locator('.table-qr-form-modal')
  await modal.locator('textarea').fill(updatedNote)
  await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()

  card = page.locator('.table-qr-card').filter({ hasText: tableName })
  await expect(card).toContainText(updatedNote)
  await card.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  detail = page.locator('.table-qr-detail-modal')

  await detail.getByRole('button', { name: 'Khóa mã', exact: true }).click()
  await acceptConfirmDialog(page)
  await expect(page.locator('.table-qr-detail-modal')).toContainText('Đã khóa')

  detail = page.locator('.table-qr-detail-modal')
  await detail.getByRole('button', { name: 'Kích hoạt lại', exact: true }).click()
  await expect(page.locator('.table-qr-detail-modal')).toContainText('Đang hoạt động')

  detail = page.locator('.table-qr-detail-modal')
  await detail.getByRole('button', { name: 'Tạo lại mã', exact: true }).click()
  await acceptConfirmDialog(page)
  detail = page.locator('.table-qr-detail-modal')
  const regeneratedCode = detail.locator('code').first()
  await expect(regeneratedCode).not.toHaveText(originalToken)
  const regeneratedToken = (await regeneratedCode.textContent())?.trim() ?? ''
  expect(regeneratedToken).not.toBe('')
  await expect(detail.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/)

  await detail.getByRole('button', { name: 'Vô hiệu hóa', exact: true }).click()
  await acceptConfirmDialog(page)
  card = page.locator('.table-qr-card').filter({ hasText: tableName })
  await expect(card).toContainText('Đã vô hiệu')
})
