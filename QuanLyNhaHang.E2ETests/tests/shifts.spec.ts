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

test('Ca làm việc: tạo, sửa, phân ca và xóa', async ({ page, request }) => {
  const id = suffix()
  const employeeCode = `SHIFT-E2E-${id}`
  const shiftCode = `CA-${id}`
  const shiftName = `Ca Playwright ${id}`
  const today = new Date().toISOString().slice(0, 10)

  const session = await loginAsAdmin(page)
  const employeeResponse = await request.post(`${apiURL}/api/Employees`, {
    headers: bearerHeaders(session),
    data: {
      employeeCode,
      ho: 'Playwright',
      ten: 'Phân ca',
      email: `shift-${id}@example.com`,
      phoneNumber: `07${id.slice(-8).padStart(8, '0')}`,
      password: 'Playwright-Shift-2026!Aa1',
      role: 'Staff',
      dateOfBirth: null,
      address: 'E2E',
      position: 'Nhân viên phân ca E2E',
      baseSalary: 6000000,
      hireDate: today,
    },
  })
  expect(employeeResponse.ok()).toBeTruthy()

  await openAdminModule(page, 'Ca làm việc & phân ca')
  await page.getByRole('button', { name: '+ Tạo ca', exact: true }).click()

  let modal = page.locator('.scheduling-modal')
  await modal.getByLabel('Mã ca', { exact: true }).fill(shiftCode)
  await modal.getByLabel('Tên ca', { exact: true }).fill(shiftName)
  await modal.getByLabel('Giờ bắt đầu', { exact: true }).fill('06:00')
  await modal.getByLabel('Giờ kết thúc', { exact: true }).fill('14:00')
  await modal.getByLabel('Mô tả', { exact: true }).fill('Ca được tạo bằng Playwright.')
  await modal.getByRole('button', { name: 'Lưu ca', exact: true }).click()

  let shiftRow = page.locator('tbody tr').filter({ hasText: shiftCode })
  await expect(shiftRow).toBeVisible()
  await expect(shiftRow).toContainText('06:00 – 14:00')

  await shiftRow.getByRole('button', { name: 'Sửa', exact: true }).click()
  modal = page.locator('.scheduling-modal')
  await modal.getByLabel('Giờ kết thúc', { exact: true }).fill('15:00')
  await modal.getByLabel('Mô tả', { exact: true }).fill('Ca Playwright đã cập nhật.')
  await modal.getByRole('button', { name: 'Lưu ca', exact: true }).click()

  shiftRow = page.locator('tbody tr').filter({ hasText: shiftCode })
  await expect(shiftRow).toContainText('06:00 – 15:00')
  await expect(shiftRow).toContainText('Ca Playwright đã cập nhật.')

  await page.getByRole('button', { name: 'Phân ca nhân viên', exact: true }).click()
  await page.getByRole('button', { name: '+ Phân ca', exact: true }).click()

  modal = page.locator('.scheduling-modal')
  await modal.getByLabel('Nhân viên', { exact: true })
    .selectOption({ label: `${employeeCode} - Playwright Phân ca` })
  await modal.getByLabel('Ca làm việc', { exact: true })
    .selectOption({ label: `${shiftCode} - ${shiftName} (06:00–15:00)` })
  await modal.getByLabel('Ngày làm', { exact: true }).fill(today)
  await modal.getByLabel('Ghi chú', { exact: true }).fill('Phân ca E2E.')
  await modal.getByRole('button', { name: 'Lưu phân công', exact: true }).click()

  let assignmentRow = page.locator('tbody tr').filter({ hasText: employeeCode })
  await expect(assignmentRow).toBeVisible()
  await expect(assignmentRow).toContainText(shiftName)
  await expect(assignmentRow).toContainText('Phân ca E2E.')

  await assignmentRow.getByRole('button', { name: 'Sửa', exact: true }).click()
  modal = page.locator('.scheduling-modal')
  await modal.getByLabel('Ghi chú', { exact: true }).fill('Phân ca E2E đã sửa.')
  await modal.getByRole('button', { name: 'Lưu phân công', exact: true }).click()
  assignmentRow = page.locator('tbody tr').filter({ hasText: employeeCode })
  await expect(assignmentRow).toContainText('Phân ca E2E đã sửa.')

  page.once('dialog', dialog => dialog.accept())
  await assignmentRow.getByRole('button', { name: 'Xóa', exact: true }).click()
  await expect(page.locator('tbody tr').filter({ hasText: employeeCode })).toHaveCount(0)

  await page.getByRole('button', { name: 'Ca làm việc', exact: true }).click()
  shiftRow = page.locator('tbody tr').filter({ hasText: shiftCode })
  page.once('dialog', dialog => dialog.accept())
  await shiftRow.getByRole('button', { name: 'Xóa', exact: true }).click()
  await expect(page.locator('tbody tr').filter({ hasText: shiftCode })).toHaveCount(0)
})
