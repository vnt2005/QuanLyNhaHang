import { expect, type Page } from '@playwright/test'

export function uniqueName(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  return `${prefix} ${suffix}`
}

export async function loginAsAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Thiếu E2E_ADMIN_EMAIL hoặc E2E_ADMIN_PASSWORD cho tài khoản Admin kiểm thử.',
    )
  }

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Đăng nhập hệ thống' }),
  ).toBeVisible()

  await page.getByLabel('Email', { exact: true }).fill(email)
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password)

  const loginResponsePromise = page.waitForResponse(response => (
    response.url().includes('/api/auth/login')
    && response.request().method() === 'POST'
  ))

  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  const loginResponse = await loginResponsePromise

  expect(loginResponse.status()).toBe(200)
  await expect(
    page.getByRole('button', { name: 'Đăng xuất', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.admin-layout')).toBeVisible()
}

export async function openAdminModule(page: Page, moduleName: string) {
  await page
    .locator('.sidebar nav')
    .getByRole('button', { name: moduleName, exact: true })
    .click()

  await expect(
    page.locator('.topbar').getByRole('heading', {
      name: moduleName,
      exact: true,
    }),
  ).toBeVisible()

  await expect(page.locator('.module-loading')).toHaveCount(0)
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))

  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1)
}
