import { expect, test } from './fixtures'
import { acceptConfirmDialog, loginAsAdmin, openAdminModule } from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')
const mailpitURL = (process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025')
  .replace(/\/$/, '')

function uniqueSuffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

function findVerificationCode(payload: unknown) {
  const content = JSON.stringify(payload)
  return content.match(/Mã xác minh email của bạn là:\s*(\d{6})/i)?.[1]
    ?? content.match(/mã xác minh[^0-9]*(\d{6})/i)?.[1]
    ?? ''
}

async function waitForVerificationCode(
  request: Parameters<typeof test>[0] extends never ? never : any,
  email: string,
) {
  let verificationCode = ''

  await expect.poll(async () => {
    const searchResponse = await request.get(
      `${mailpitURL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
    )

    if (!searchResponse.ok()) {
      return ''
    }

    const searchResult = await searchResponse.json()
    const messages = searchResult.messages ?? searchResult.Messages ?? []

    for (const message of messages) {
      verificationCode = findVerificationCode(message)
      if (verificationCode) {
        return verificationCode
      }

      const messageId = message.ID ?? message.Id ?? message.id
      if (!messageId) {
        continue
      }

      const messageResponse = await request.get(`${mailpitURL}/api/v1/message/${messageId}`)
      if (!messageResponse.ok()) {
        continue
      }

      verificationCode = findVerificationCode(await messageResponse.json())
      if (verificationCode) {
        return verificationCode
      }
    }

    return ''
  }, {
    message: `Không tìm thấy mã xác minh Mailpit cho ${email}`,
    timeout: 15_000,
    intervals: [250, 500, 1_000],
  }).toMatch(/^\d{6}$/)

  return verificationCode
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

  await row.getByRole('button', { name: 'Ngừng', exact: true }).click()
  await acceptConfirmDialog(page)
  await expect(page.locator('.inline-alert.success')).toBeVisible()
  await expect(page.locator('tbody tr').filter({ hasText: employeeCode }))
    .toContainText('Ngừng hoạt động')
})

test('Khách hàng: đăng ký, xác minh email, tìm kiếm, xem chi tiết, cập nhật và khóa', async ({ page, request }) => {
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

  const verificationCode = await waitForVerificationCode(request, email)
  const verifyResponse = await request.post(`${apiURL}/api/auth/verify-email`, {
    data: {
      email,
      code: verificationCode,
    },
  })
  expect(verifyResponse.ok()).toBeTruthy()

  await loginAsAdmin(page)
  await openAdminModule(page, 'Khách hàng')

  const search = page.getByPlaceholder('Tìm theo tên, email hoặc số điện thoại...')
  await search.fill(email)
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()

  let row = page.locator('tbody tr').filter({ hasText: email })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Đã xác minh')
  await expect(row).toContainText('Hoạt động')

  await row.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  const detail = page.locator('.customer-detail-modal')
  await expect(detail).toContainText(email)
  await expect(detail).toContainText(phone)
  await expect(detail).toContainText('Đã xác minh')
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
  await expect(row).toContainText('Đã xác minh')
  await expect(row).toContainText('Đã khóa')

  await page.locator('.customer-toolbar select').selectOption('locked')
  await expect(page.locator('tbody tr').filter({ hasText: email })).toBeVisible()
})
