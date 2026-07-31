import { expect, test } from './fixtures'
import {
  bearerHeaders,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

test('Nhật ký: command được ghi, lọc, xem chi tiết và xóa bởi Admin', async ({ page, request }) => {
  const id = `${Date.now()}${Math.floor(Math.random() * 10_000)}`
  const areaName = `Khu audit E2E ${id}`

  const session = await loginAsAdmin(page)
  const createResponse = await request.post(`${apiURL}/api/Areas`, {
    headers: bearerHeaders(session),
    data: { name: areaName, description: 'Tạo để kiểm tra ActivityLogBehavior.' },
  })
  expect(createResponse.ok()).toBeTruthy()
  const area = await createResponse.json() as { id: string }

  await openAdminModule(page, 'Nhật ký hoạt động')
  await page.getByPlaceholder('Người dùng, mô tả, module, thực thể…').fill(area.id)
  await page.getByPlaceholder('Orders, Payments…').fill('Areas')
  await page.getByPlaceholder('Create, Update, Get…').fill('Create')
  await page.locator('.activity-filters select').selectOption('Success')

  const row = page.locator('.activity-table tbody tr').filter({ hasText: area.id })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Create')
  await expect(row).toContainText('Areas')
  await expect(row).toContainText('Thành công')

  await row.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  const detail = page.locator('.activity-modal')
  await expect(detail).toContainText(area.id)
  await expect(detail).toContainText(areaName)
  await expect(detail).toContainText('Success')

  page.once('dialog', dialog => dialog.accept())
  await detail.getByRole('button', { name: 'Xóa vĩnh viễn nhật ký', exact: true }).click()
  await expect(page.locator('.activity-table tbody tr').filter({ hasText: area.id })).toHaveCount(0)
  await expect(page.locator('.activity-alert.success')).toContainText('xóa')
})
