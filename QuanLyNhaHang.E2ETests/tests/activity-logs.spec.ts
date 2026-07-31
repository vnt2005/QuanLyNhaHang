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
  await page.getByPlaceholder('Orders, Payments…').fill('Areas')
  await page.getByPlaceholder('Create, Update, Get…').fill('Create')
  await page.locator('.activity-filters select').selectOption('Success')

  const rows = page.locator('.activity-table tbody tr').filter({ hasText: 'Areas' })
    .filter({ hasText: 'Create' })
  await expect.poll(() => rows.count()).toBeGreaterThanOrEqual(1)

  let matchedRow = rows.first()
  const rowCount = await rows.count()
  for (let index = 0; index < rowCount; index += 1) {
    const candidate = rows.nth(index)
    await candidate.getByRole('button', { name: 'Chi tiết', exact: true }).click()
    const detail = page.locator('.activity-modal')
    if ((await detail.textContent())?.includes(area.id)) {
      matchedRow = candidate
      break
    }
    await detail.locator('header button').click()
    await expect(detail).toHaveCount(0)
  }

  const detail = page.locator('.activity-modal')
  await expect(detail).toContainText(area.id)
  await expect(detail).toContainText(areaName)
  await expect(detail).toContainText('Success')

  page.once('dialog', dialog => dialog.accept())
  await detail.getByRole('button', { name: 'Xóa vĩnh viễn nhật ký', exact: true }).click()
  await expect(matchedRow).toHaveCount(0)
  await expect(page.locator('.activity-alert.success')).toContainText('xóa')
})
