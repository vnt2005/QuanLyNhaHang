import { expect, test } from './fixtures'
import {
  bearerHeaders,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

type ActivityLogPage = {
  items: Array<{ id: string; entityId?: string | null }>
}

test('Nhật ký: command được ghi, lọc, xem chi tiết và xóa bởi Admin', async ({ page, request }) => {
  const id = `${Date.now()}${Math.floor(Math.random() * 10_000)}`
  const areaName = `Khu audit E2E ${id}`
  const updatedAreaName = `${areaName} đã cập nhật`

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)
  const createResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: { name: areaName, description: 'Tạo dữ liệu nền để kiểm tra ActivityLogBehavior.' },
  })
  expect(createResponse.ok()).toBeTruthy()
  const area = await createResponse.json() as { id: string }

  const updateResponse = await request.put(`${apiURL}/api/Areas/${area.id}`, {
    headers,
    data: {
      id: area.id,
      name: updatedAreaName,
      description: 'Cập nhật để kiểm tra nhật ký có đúng entityId.',
    },
  })
  expect(updateResponse.ok()).toBeTruthy()

  const activityQueryUrl = `${apiURL}/api/activity-logs/paginated?entityId=${encodeURIComponent(area.id)}&moduleName=Areas&action=Update&status=Success&pageNumber=1&pageSize=10`

  let activityLogId = ''
  await expect.poll(async () => {
    const response = await request.get(activityQueryUrl, { headers })
    if (!response.ok()) return ''

    const body = await response.json() as ActivityLogPage
    activityLogId = body.items.find(item => item.entityId === area.id)?.id ?? ''
    return activityLogId
  }).not.toBe('')

  await openAdminModule(page, 'Nhật ký hoạt động')
  await page.getByPlaceholder('Orders, Payments…').fill('Areas')
  await page.getByPlaceholder('Create, Update, Get…').fill('Update')
  await page.locator('.activity-filters select').selectOption('Success')
  await page.getByRole('button', { name: /Làm mới/ }).click()

  const matchedRow = page.locator('.activity-table tbody tr')
    .filter({ hasText: 'Areas' })
    .filter({ hasText: 'Update' })
    .filter({ hasText: area.id })
  await expect(matchedRow).toHaveCount(1)
  await matchedRow.getByRole('button', { name: 'Chi tiết', exact: true }).click()

  const detail = page.locator('.activity-modal')
  await expect(detail).toContainText(area.id)
  await expect(detail).toContainText('Areas')
  await expect(detail).toContainText('Update')
  await expect(detail).toContainText('Success')

  page.once('dialog', dialog => dialog.accept())
  await detail.getByRole('button', { name: 'Xóa vĩnh viễn nhật ký', exact: true }).click()
  await expect(detail).toHaveCount(0)
  await expect(page.locator('.activity-alert.success')).toContainText(/xóa/i)

  const afterDeleteResponse = await request.get(activityQueryUrl, { headers })
  expect(afterDeleteResponse.ok()).toBeTruthy()
  const afterDelete = await afterDeleteResponse.json() as ActivityLogPage
  expect(afterDelete.items.some(item => item.id === activityLogId)).toBeFalsy()
})
