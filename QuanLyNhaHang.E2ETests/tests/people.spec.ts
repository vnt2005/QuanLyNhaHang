import { expect, test } from './fixtures'
import { loginAsAdmin, openAdminModule } from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

test('Nhân viên: tạo, tìm kiếm, sửa và ngừng hoạt động', async ({ page }) => {
  const suffix = uniqueSuffix()
  const employeeCode = `E2E-${suffix}`
  const email = `employee-${suffix}@example.com`
  const phone = `09${suffix.slice(-8).padStart(8, '0')}`

  await loginAsAdmin(page)
  await openAdminModule(page, 'Nhân viên')
  await page.getByRole('button', { name: '+ Thêm nhân viên', exact: true }).click()

  const modal = page.locator('.employee-modal').filter({
    has: page.getByRole('heading', { name: 'Thêm nhân viên', exact: true }),
  })
  await modal.getByLabel('Mã nhân viên', { exact: true }).fill(employeeCode)
  await modal.getByLabel('Họ', { exact: true }).fill('Playwright')
  await modal.getByLabel('Tên', { exact: true }).fill('Nhân viên')
  await modal.getByLabel('Email', { exact: true }).fill(email)
  await modal.getByLabel('Số điện thoại', { exact: true }).fill(phone)
  await modal.getByLabel('Mật khẩu', { exact: true }).fill('Playwright-Employee-2026!Aa1')
  await modal.locator('select').selectOption('Staff')
  await modal.getByLabel('Vị trí công việc', { exact: true }).fill('Phục vụ E2E')
  await modal.getByLabel('Lương cơ bản', { exact: true }).fill('7000000')
  await modal.getByRole('button', { name: 'Lưu nhân viên', exact: true }).click()

  await expect(page.getByText('Tạo nhân viên và tài khoản đăng nhập thành công.', { exact: true })).toBeVisible()
  const search = page.getByPlaceholder('Tìm mã, tên, email, số điện thoại, vị trí...')
  await search.fill(employeeCode)
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()

  let row = page.locator('tbody tr').filter({ hasText: employeeCode })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Phục vụ E2E')
  await expect(row).toContainText('7.000.000 ₫')

  await row.getByRole('button', { name: 'Sửa', exact: true }).click()
  const editModal = page.locator('.employee-modal').filter({
    has: page.getByRole('heading', { name: 'Cập nhật nhân viên', exact: true }),
  })
  await editModal.getByLabel('Vị trí công việc', { exact: true }).fill('Thu ngân E2E')
  await editModal.getByLabel('Lương cơ bản', { exact: true }).fill('8500000')
  await editModal.getByRole('button', { name: 'Lưu nhân viên', exact: true }).click()

  await expect(page.getByText('Cập nhật nhân viên thành công.', { exact: true })).toBeVisible()
  row = page.locator('tbody tr').filter({ hasText: employeeCode })
  await expect(row).toContainText('Thu ngân E2E')
  await expect(row).toContainText('8.500.000 ₫')

  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Ngừng', exact: true }).click()
  await expect(page.getByText('Đã ngừng hoạt động nhân viên.', { exact: true })).toBeVisible()
  await expect(page.locator('tbody tr').filter({ hasText: employeeCode }))
    .toContainText('Ngừng hoạt động')
})

test('Khách hàng: đăng ký, tìm kiếm, xem chi tiết, cập nhật và khóa', async ({ page, request }) => {
  const suffix = uniqueSuffix()
  const email = `customer-${suffix}@example.com`
  const phone = `08${suffix.slice(-8).padStart(8, '0')}`

  const registerResponse = await request.post(`${apiURL}/api/auth/register`, {
    data: {
      ho: 'Playwright',
      ten: 'Khách hàng',
      email,
      phoneNumber: phone,
      password: 'Playwright-Customer-2026!Aa1',
    },
  })
  expect(registerResponse.ok()).toBeTruthy()

  await loginAsAdmin(page)
  await openAdminModule(page, 'Khách hàng')

  const search = page.getByPlaceholder('Tìm theo tên, email hoặc số điện thoại...')
  await search.fill(email)
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()

  let row = page.locator('tbody tr').filter({ hasText: email })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Chưa xác minh')
  await expect(row).toContainText('Hoạt động')

  await row.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  const detail = page.locator('.customer-detail-modal')
  await expect(detail).toContainText(email)
  await expect(detail).toContainText(phone)
  await detail.getByRole('button', { name: 'Đóng', exact: true }).click()

  row = page.locator('tbody tr').filter({ hasText: email })
  await row.getByRole('button', { name: 'Sửa', exact: true }).click()
  const edit = page.locator('.customer-edit-modal')
  await edit.getByLabel('Tên', { exact: true }).fill('Khách E2E đã sửa')
  await edit.getByLabel('Cho phép tài khoản đăng nhập', { exact: true }).uncheck()
  await edit.getByRole('button', { name: 'Lưu khách hàng', exact: true }).click()

  await expect(page.getByText('Cập nhật người dùng thành công.', { exact: true })).toBeVisible()
  row = page.locator('tbody tr').filter({ hasText: email })
  await expect(row).toContainText('Khách E2E đã sửa')
  await expect(row).toContainText('Đã khóa')

  await page.locator('.customer-toolbar select').selectOption('locked')
  await expect(page.locator('tbody tr').filter({ hasText: email })).toBeVisible()
})
