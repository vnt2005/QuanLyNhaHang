import { expect, type Page } from '@playwright/test'

export type E2EAuthSession = {
  token: string
  refreshToken?: string
  userId?: string
  role?: string
  permissions: string[]
}

type LoginEnvelope = {
  data?: Partial<E2EAuthSession>
  token?: string
  refreshToken?: string
  userId?: string
  role?: string
  permissions?: string[]
}

const minimumLoginIntervalMs = 6_500
let lastLoginAttemptAt = 0

async function waitForLoginSlot(page: Page) {
  const elapsed = Date.now() - lastLoginAttemptAt
  const remaining = minimumLoginIntervalMs - elapsed
  if (remaining > 0) {
    await page.waitForTimeout(remaining)
  }
  lastLoginAttemptAt = Date.now()
}

export function uniqueName(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  return `${prefix} ${suffix}`
}

export function bearerHeaders(session: E2EAuthSession) {
  return {
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json',
  }
}

export async function loginAsAdmin(page: Page): Promise<E2EAuthSession> {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'Thiếu E2E_ADMIN_EMAIL hoặc E2E_ADMIN_PASSWORD cho tài khoản Admin kiểm thử.',
    )
  }

  await waitForLoginSlot(page)
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
  const envelope = await loginResponse.json() as LoginEnvelope
  const payload = envelope.data ?? envelope
  const token = payload.token ?? ''
  expect(token, 'Backend phải trả access token sau khi đăng nhập.').not.toBe('')

  await expect(
    page.getByRole('button', { name: 'Đăng xuất', exact: true }),
  ).toBeVisible()
  await expect(page.locator('.admin-layout')).toBeVisible()

  return {
    token,
    refreshToken: payload.refreshToken,
    userId: payload.userId,
    role: payload.role,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  }
}

export async function acceptConfirmDialog(page: Page) {
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()

  const confirmButton = dialog
    .locator('.ds-confirm-actions')
    .getByRole('button')
    .last()
  await expect(confirmButton).toBeEnabled()
  await confirmButton.click()
  await expect(dialog).toHaveCount(0)
}

export async function openAdminModule(page: Page, moduleName: string) {
  const navigationButton = page
    .locator('.sidebar nav button')
    .filter({ hasText: moduleName })

  await expect(navigationButton).toHaveCount(1)
  await navigationButton.click()

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
