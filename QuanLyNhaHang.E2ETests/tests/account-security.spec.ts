import { expect, test } from './fixtures'
import { acceptConfirmDialog, loginAsAdmin, openAdminModule } from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

test('Bảo mật tài khoản: hiển thị, thu hồi phiên khác và đăng xuất tất cả', async ({ page, request }) => {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!email || !password) throw new Error('Thiếu tài khoản Admin E2E.')

  await loginAsAdmin(page)
  await openAdminModule(page, 'Bảo mật tài khoản')

  await expect(page.getByRole('heading', { name: 'Tài khoản & phiên đăng nhập' }))
    .toBeVisible()
  await expect(page.locator('.account-profile-card')).toContainText(email)
  await expect(page.locator('.account-profile-card')).toContainText('Admin')
  await expect(page.getByText('Thiết bị hiện tại', { exact: true })).toBeVisible()

  const sessions = page.locator('.account-session-list > div')
  await expect.poll(() => sessions.count()).toBeGreaterThanOrEqual(1)

  const revokeButtons = page.getByRole('button', { name: 'Thu hồi', exact: true })
  if (await revokeButtons.count() === 0) {
    const additionalLogin = await request.post(`${apiURL}/api/auth/login`, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Playwright-E2E-Secondary-Session',
      },
      data: { email, password },
    })
    expect(additionalLogin.status()).toBe(200)

    await page.getByRole('button', { name: '↻ Làm mới', exact: true }).click()
    await expect.poll(() => revokeButtons.count()).toBeGreaterThanOrEqual(1)
  }

  const revokeCountBefore = await revokeButtons.count()
  await revokeButtons.first().click()
  await acceptConfirmDialog(page)
  await expect.poll(() => revokeButtons.count()).toBe(revokeCountBefore - 1)
  await expect(page.locator('.account-session-list')).toContainText('Đã thu hồi')

  await page.getByRole('button', { name: '↻ Làm mới', exact: true }).click()
  await expect(page.getByText('Thiết bị hiện tại', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Đăng xuất tất cả', exact: true }).click()
  await acceptConfirmDialog(page)
  await expect(page.getByRole('heading', { name: 'Đăng nhập hệ thống' })).toBeVisible()
  await expect(page.getByText(/phiên đã được thu hồi/i)).toBeVisible()
})
