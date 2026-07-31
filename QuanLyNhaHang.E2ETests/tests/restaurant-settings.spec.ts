import { expect, test } from './fixtures'
import { loginAsAdmin, openAdminModule } from './helpers'

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

test('Cấu hình nhà hàng: tạo, xem, sửa, vô hiệu và kích hoạt', async ({ page }) => {
  test.skip(
    process.env.E2E_ALLOW_SETTINGS_MUTATION !== 'true',
    'Chỉ chạy khi cho phép thay đổi cấu hình nhà hàng trên database kiểm thử.',
  )

  const id = suffix()
  const name = `Nhà hàng Playwright ${id}`
  const updatedName = `${name} đã sửa`

  await loginAsAdmin(page)
  await openAdminModule(page, 'Cấu hình nhà hàng')
  await page.getByRole('button', { name: '+ Tạo cấu hình', exact: true }).click()

  let modal = page.locator('.restaurant-settings-modal.form-modal')
  await modal.getByLabel(/Tên nhà hàng/).fill(name)
  await modal.getByLabel(/Số điện thoại/).fill(`03${id.slice(-8).padStart(8, '0')}`)
  await modal.getByLabel('Email', { exact: true }).fill(`restaurant-${id}@example.com`)
  await modal.getByLabel('Mã số thuế', { exact: true }).fill(`MST${id}`)
  await modal.getByLabel(/Địa chỉ/).fill('Địa chỉ nhà hàng Playwright E2E')
  await modal.getByLabel('Website', { exact: true }).fill('https://example.com')
  await modal.getByLabel(/Giờ mở cửa/).fill('07:00')
  await modal.getByLabel(/Giờ đóng cửa/).fill('23:00')
  await modal.getByLabel(/Đơn vị tiền tệ/).fill('VND')
  await modal.getByLabel('VAT mặc định (%)', { exact: true }).fill('8')
  await modal.getByLabel('Phí phục vụ (%)', { exact: true }).fill('5')
  await modal.getByLabel(/Lời cuối hóa đơn/).fill('Cảm ơn từ Playwright.')
  await modal.getByLabel(/Lời chào khi gọi món QR/).fill('Chào mừng khách E2E.')
  await modal.getByRole('button', { name: 'Tạo và kích hoạt', exact: true }).click()

  let row = page.locator('.restaurant-settings-table tbody tr').filter({ hasText: name })
  await expect(row).toBeVisible()
  await expect(row).toContainText('07:00 – 23:00')
  await expect(row).toContainText('VAT 8%')
  await expect(row).toContainText('Đang hoạt động')
  await expect(page.locator('.active-setting-card')).toContainText(name)

  await row.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  let detail = page.locator('.restaurant-settings-modal.detail-modal')
  await expect(detail).toContainText(name)
  await expect(detail).toContainText('Cảm ơn từ Playwright.')
  await expect(detail).toContainText('Chào mừng khách E2E.')
  await detail.getByRole('button', { name: 'Đóng', exact: true }).click()

  row = page.locator('.restaurant-settings-table tbody tr').filter({ hasText: name })
  await row.getByRole('button', { name: 'Sửa', exact: true }).click()
  modal = page.locator('.restaurant-settings-modal.form-modal')
  await modal.getByLabel(/Tên nhà hàng/).fill(updatedName)
  await modal.getByLabel('VAT mặc định (%)', { exact: true }).fill('10')
  await modal.getByLabel('Phí phục vụ (%)', { exact: true }).fill('7.5')
  await modal.getByLabel(/Lời cuối hóa đơn/).fill('Nội dung hóa đơn đã sửa.')
  await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()

  row = page.locator('.restaurant-settings-table tbody tr').filter({ hasText: updatedName })
  await expect(row).toContainText('VAT 10%')
  await expect(row).toContainText('Phục vụ 7,5%')

  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Vô hiệu', exact: true }).click()
  row = page.locator('.restaurant-settings-table tbody tr').filter({ hasText: updatedName })
  await expect(row).toContainText('Đã vô hiệu')
  await expect(page.getByRole('button', { name: '+ Tạo cấu hình', exact: true })).toBeEnabled()

  page.once('dialog', dialog => dialog.accept())
  await row.getByRole('button', { name: 'Kích hoạt', exact: true }).click()
  await expect(page.locator('.restaurant-settings-table tbody tr').filter({ hasText: updatedName }))
    .toContainText('Đang hoạt động')
  await expect(page.locator('.active-setting-card')).toContainText(updatedName)

  await page.locator('.restaurant-settings-table tbody tr').filter({ hasText: updatedName })
    .getByRole('button', { name: 'Chi tiết', exact: true }).click()
  detail = page.locator('.restaurant-settings-modal.detail-modal')
  await expect(detail).toContainText('Nội dung hóa đơn đã sửa.')
  await detail.getByRole('button', { name: 'Đóng', exact: true }).click()
})
