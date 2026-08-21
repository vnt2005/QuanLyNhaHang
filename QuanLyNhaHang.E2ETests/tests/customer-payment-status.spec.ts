import { expect, test } from '@playwright/test'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')
const customerURL = (
  process.env.E2E_CUSTOMER_BASE_URL ?? 'http://localhost:5174'
).replace(/\/$/, '')

test('CustomerWeb: phiên SePay tự chuyển sang thành công và gửi attemptId khi kiểm tra', async ({ page }) => {
  const orderId = '11111111-1111-1111-1111-111111111111'
  const attemptId = '22222222-2222-2222-2222-222222222222'
  const statusUrls: string[] = []
  let paid = false

  await page.route(
    `${apiURL}/api/customer-payments/orders/${orderId}/status?*`,
    route => {
      statusUrls.push(route.request().url())
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orderId,
          orderCode: 'ORD-PAYMENT-E2E',
          orderStatus: paid ? 'Completed' : 'Served',
          paid,
          paymentCode: paid ? 'PAY-PAYMENT-E2E' : null,
          amount: 11_000,
          paidAt: paid ? new Date().toISOString() : null,
          paymentMethod: paid ? 'BankTransfer' : null,
          attemptId,
          attemptStatus: paid ? 'Paid' : 'Pending',
          requiresReview: false,
          expectedAmount: 11_000,
          expiresAt: new Date(Date.now() + 15 * 60 * 1_000).toISOString(),
          qrCode: paid
            ? null
            : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22/%3E',
          transferContent: 'DH5051508',
          bankCode: 'TPBank',
          accountNumber: '10003581633',
          accountHolder: 'VO NGUYEN THANH',
        }),
      })
    },
  )

  await page.goto(
    `${customerURL}/payment-result?orderId=${orderId}&attemptId=${attemptId}`,
  )

  await expect(page.getByRole('heading', { name: 'Quét QR để thanh toán' }))
    .toBeVisible()
  await expect(page.getByAltText('Mã QR VietQR thanh toán đơn hàng'))
    .toBeVisible()

  paid = true
  await page.getByRole('button', { name: 'Kiểm tra ngay' }).click()

  await expect(page.getByRole('heading', { name: 'Thanh toán thành công' }))
    .toBeVisible()
  await expect(page.getByText(/đã thanh toán.*11\.000/)).toBeVisible()
  await expect(page.getByAltText('Mã QR VietQR thanh toán đơn hàng'))
    .toHaveCount(0)
  expect(statusUrls.length).toBeGreaterThanOrEqual(2)
  expect(statusUrls.every(url => url.includes(`attemptId=${attemptId}`)))
    .toBeTruthy()
})
