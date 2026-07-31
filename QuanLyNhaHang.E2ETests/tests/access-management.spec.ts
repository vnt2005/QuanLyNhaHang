import { expect, test } from './fixtures'
import { loginAsAdmin, openAdminModule } from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

test('Vai trò: tạo, sửa, phân quyền, kiểm tra lưu và vô hiệu hóa', async ({ page }) => {
  const id = suffix()
  const roleName = `E2ERole${id}`
  const displayName = `Vai trò Playwright ${id}`
  const updatedDisplayName = `${displayName} đã sửa`

  await loginAsAdmin(page)
  await openAdminModule(page, 'Tài khoản & phân quyền')
  await page.getByRole('button', { name: /Vai trò \(/ }).click()
  await page.getByRole('button', { name: '+ Thêm vai trò', exact: true }).click()

  let modal = page.locator('.access-modal').filter({
    has: page.getByRole('heading', { name: 'Thêm vai trò', exact: true }),
  })
  await modal.getByLabel('Tên hệ thống', { exact: true }).fill(roleName)
  await modal.getByLabel('Tên hiển thị', { exact: true }).fill(displayName)
  await modal.getByLabel('Mô tả', { exact: true }).fill('Vai trò tạo bởi Playwright E2E.')
  await modal.getByRole('button', { name: 'Lưu vai trò', exact: true }).click()

  let card = page.locator('.role-card').filter({ hasText: roleName })
  await expect(card).toBeVisible()
  await expect(card).toContainText(displayName)
  await expect(card).toContainText('Hoạt động')

  await card.getByRole('button', { name: 'Sửa', exact: true }).click()
  modal = page.locator('.access-modal').filter({
    has: page.getByRole('heading', { name: 'Cập nhật vai trò', exact: true }),
  })
  await modal.getByLabel('Tên hiển thị', { exact: true }).fill(updatedDisplayName)
  await modal.getByLabel('Mô tả', { exact: true }).fill('Mô tả vai trò đã cập nhật.')
  await modal.getByRole('button', { name: 'Lưu vai trò', exact: true }).click()

  card = page.locator('.role-card').filter({ hasText: roleName })
  await expect(card).toContainText(updatedDisplayName)
  await expect(card).toContainText('Mô tả vai trò đã cập nhật.')

  await card.getByRole('button', { name: 'Phân quyền', exact: true }).click()
  let permissionModal = page.locator('.permission-modal')
  await expect(permissionModal.getByText(/\/60 quyền/)).toBeVisible()
  await permissionModal.getByPlaceholder('Tìm mã quyền, tên quyền hoặc nhóm...')
    .fill('Dashboard.View')

  const dashboardPermission = permissionModal.locator('.permission-item')
    .filter({ hasText: 'Dashboard.View' })
  await expect(dashboardPermission).toBeVisible()
  await dashboardPermission.getByRole('checkbox').check()
  await permissionModal.getByRole('button', { name: 'Lưu phân quyền', exact: true }).click()

  card = page.locator('.role-card').filter({ hasText: roleName })
  await card.getByRole('button', { name: 'Phân quyền', exact: true }).click()
  permissionModal = page.locator('.permission-modal')
  await permissionModal.getByPlaceholder('Tìm mã quyền, tên quyền hoặc nhóm...')
    .fill('Dashboard.View')
  await expect(
    permissionModal.locator('.permission-item')
      .filter({ hasText: 'Dashboard.View' })
      .getByRole('checkbox'),
  ).toBeChecked()
  await permissionModal.getByRole('button', { name: 'Hủy', exact: true }).click()

  card = page.locator('.role-card').filter({ hasText: roleName })
  page.once('dialog', dialog => dialog.accept())
  await card.getByRole('button', { name: 'Vô hiệu', exact: true }).click()
  await expect(page.locator('.role-card').filter({ hasText: roleName }))
    .toContainText('Vô hiệu')
})

test('Tài khoản: cập nhật và xóa tài khoản thử nghiệm', async ({ page, request }) => {
  const id = suffix()
  const email = `access-user-${id}@example.com`
  const phone = `06${id.slice(-8).padStart(8, '0')}`

  const registerResponse = await request.post(`${apiURL}/api/auth/register`, {
    data: {
      ho: 'Playwright',
      ten: 'Tài khoản',
      email,
      phoneNumber: phone,
      password: 'Playwright-Access-2026!Aa1',
    },
  })
  expect(registerResponse.status()).toBe(200)

  await loginAsAdmin(page)
  await openAdminModule(page, 'Tài khoản & phân quyền')
  const search = page.getByPlaceholder('Tìm tên, email, số điện thoại hoặc vai trò...')
  await search.fill(email)
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()

  let row = page.locator('tbody tr').filter({ hasText: email })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: 'Sửa', exact: true }).click()

  const modal = page.locator('.access-modal').filter({
    has: page.getByRole('heading', { name: 'Cập nhật tài khoản', exact: true }),
  })
  await modal.getByLabel('Tên', { exact: true }).fill('Tài khoản đã sửa')
  await modal.getByLabel('Vai trò', { exact: true }).selectOption('Customer')
  await modal.getByLabel('Tài khoản đang hoạt động', { exact: true }).uncheck()
  await modal.getByRole('button', { name: 'Lưu tài khoản', exact: true }).click()

  row = page.locator('tbody tr').filter({ hasText: email })
  await expect(row).toContainText('Tài khoản đã sửa')
  await expect(row).toContainText('Đã khóa')

  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Xóa', exact: true }).click()
  await expect(page.locator('tbody tr').filter({ hasText: email })).toHaveCount(0)
})
