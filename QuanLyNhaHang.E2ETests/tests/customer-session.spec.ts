// These regression tests deliberately inject 401/429/503 responses. Import
// Playwright directly because the shared fixture correctly treats every API
// error response as an unexpected failure for normal end-to-end scenarios.
import { expect, test } from '@playwright/test'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')
const customerURL = (
  process.env.E2E_CUSTOMER_BASE_URL ?? 'http://localhost:5174'
).replace(/\/$/, '')

function accessToken(version: number) {
  const encode = (value: object) => Buffer
    .from(JSON.stringify(value))
    .toString('base64url')

  return [
    encode({ alg: 'HS256', typ: 'JWT' }),
    encode({ exp: Math.floor(Date.now() / 1_000) + 3_600, version }),
    'test-signature',
  ].join('.')
}

function authEnvelope(refreshToken: string, version: number) {
  return {
    message: 'Đăng nhập thành công.',
    data: {
      userId: '11111111-1111-1111-1111-111111111111',
      sessionId: '22222222-2222-2222-2222-222222222222',
      ho: 'Khách',
      ten: 'Kiểm thử',
      email: 'customer-session@example.com',
      phoneNumber: '0900000099',
      role: 'Customer',
      isEmailVerified: true,
      requiresEmailVerification: false,
      requiresTwoFactor: false,
      token: accessToken(version),
      refreshToken,
      refreshTokenExpiresAt: new Date(
        Date.now() + 24 * 60 * 60 * 1_000,
      ).toISOString(),
    },
  }
}

async function mockAuthenticatedCustomerData(
  page: import('@playwright/test').Page,
) {
  await page.route(`${apiURL}/api/customer/orders?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [],
      pageNumber: 1,
      totalPages: 1,
      totalCount: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    }),
  }))
  await page.route(`${apiURL}/api/notifications?*`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [], unreadCount: 0 }),
  }))
}

test('CustomerWeb: đăng nhập mới không bị refresh cũ xóa phiên', async ({ page }) => {
  let releaseRefresh!: () => void
  let markRefreshStarted!: () => void
  let markRefreshFinished!: () => void
  const refreshStarted = new Promise<void>(resolve => {
    markRefreshStarted = resolve
  })
  const refreshCanFinish = new Promise<void>(resolve => {
    releaseRefresh = resolve
  })
  const refreshFinished = new Promise<void>(resolve => {
    markRefreshFinished = resolve
  })

  await page.addInitScript(() => {
    sessionStorage.setItem('customerRefreshToken', 'stale-refresh-token')
  })
  await mockAuthenticatedCustomerData(page)
  await page.route(`${apiURL}/api/auth/refresh`, async route => {
    markRefreshStarted()
    await refreshCanFinish
    await route.fulfill({
      status: 429,
      contentType: 'application/problem+json',
      body: JSON.stringify({ message: 'Bạn thao tác quá nhanh.' }),
    })
    markRefreshFinished()
  })
  await page.route(`${apiURL}/api/auth/login`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(authEnvelope('login-refresh-token', 10)),
  }))
  await page.route(
    `${apiURL}/hubs/admin-notifications/negotiate?*`,
    route => route.fulfill({ status: 503 }),
  )

  await page.goto(`${customerURL}/orders`)
  await refreshStarted

  await page.getByLabel('Email *', { exact: true })
    .fill('customer-session@example.com')
  await page.getByLabel('Mật khẩu *', { exact: true })
    .fill('Customer-Test-2026!')
  await page.getByRole('button', { name: 'Đăng nhập ngay', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Đơn của tôi' })).toBeVisible()
  await expect.poll(() => page.evaluate(
    () => sessionStorage.getItem('customerRefreshToken'),
  )).toBe('login-refresh-token')

  releaseRefresh()
  await refreshFinished
  await page.waitForTimeout(250)

  await expect(page.getByRole('heading', { name: 'Đơn của tôi' })).toBeVisible()
  await expect.poll(() => page.evaluate(
    () => sessionStorage.getItem('customerRefreshToken'),
  )).toBe('login-refresh-token')
})

test('CustomerWeb: hub 401 chỉ được làm mới phiên một lần', async ({ page }) => {
  let refreshCount = 0
  const hubUrls: string[] = []

  await page.addInitScript(() => {
    sessionStorage.setItem('customerRefreshToken', 'initial-refresh-token')
  })
  await mockAuthenticatedCustomerData(page)
  await page.route(`${apiURL}/api/auth/refresh`, route => {
    refreshCount += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authEnvelope(`rotated-refresh-${refreshCount}`, refreshCount)),
    })
  })
  await page.route(
    `${apiURL}/hubs/admin-notifications/negotiate?*`,
    route => {
      hubUrls.push(route.request().url())
      return route.fulfill({ status: 401 })
    },
  )

  await page.goto(`${customerURL}/orders`)
  await expect(page.getByRole('heading', { name: 'Đơn của tôi' })).toBeVisible()
  await expect.poll(() => refreshCount).toBe(2)
  await expect.poll(() => hubUrls.length).toBeGreaterThanOrEqual(2)
  await page.waitForTimeout(750)

  expect(refreshCount).toBe(2)
  expect(hubUrls.every(url => url.startsWith(apiURL))).toBeTruthy()
})

test('CustomerWeb: refresh token cũ trong localStorage không tự đăng nhập lại', async ({ page }) => {
  let refreshCount = 0

  await page.addInitScript(() => {
    localStorage.setItem('customerRefreshToken', 'legacy-persistent-token')
  })
  await page.route(`${apiURL}/api/auth/refresh`, route => {
    refreshCount += 1
    return route.fulfill({ status: 500 })
  })

  await page.goto(`${customerURL}/orders`)

  await expect(page.getByRole('heading', { name: 'Đăng nhập tài khoản' }))
    .toBeVisible()
  await expect.poll(() => page.evaluate(
    () => localStorage.getItem('customerRefreshToken'),
  )).toBeNull()
  expect(refreshCount).toBe(0)
})

test('CustomerWeb: mở URL ở tab mới bắt đầu ở trạng thái chưa đăng nhập', async ({ context, page }) => {
  let refreshCount = 0

  await page.route(`${apiURL}/api/auth/login`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(authEnvelope('tab-refresh-token', 20)),
  }))
  await mockAuthenticatedCustomerData(page)
  await page.route(`${apiURL}/api/auth/refresh`, route => {
    refreshCount += 1
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authEnvelope('tab-refresh-token-rotated', 21)),
    })
  })
  await page.route(
    `${apiURL}/hubs/admin-notifications/negotiate?*`,
    route => route.fulfill({ status: 503 }),
  )

  await page.goto(`${customerURL}/orders`)
  await page.getByLabel('Email *', { exact: true })
    .fill('customer-session@example.com')
  await page.getByLabel('Mật khẩu *', { exact: true })
    .fill('Customer-Test-2026!')
  await page.getByRole('button', { name: 'Đăng nhập ngay', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Đơn của tôi' })).toBeVisible()
  await expect.poll(() => page.evaluate(
    () => sessionStorage.getItem('customerRefreshToken'),
  )).toBe('tab-refresh-token')

  const newTab = await context.newPage()
  await newTab.goto(`${customerURL}/orders`)

  await expect(newTab.getByRole('heading', { name: 'Đăng nhập tài khoản' }))
    .toBeVisible()
  expect(await newTab.evaluate(
    () => sessionStorage.getItem('customerRefreshToken'),
  )).toBeNull()
  expect(await newTab.evaluate(
    () => localStorage.getItem('customerRefreshToken'),
  )).toBeNull()
  expect(refreshCount).toBe(0)
})
