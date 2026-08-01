import { expect, test } from './fixtures'
import { acceptConfirmDialog, loginAsAdmin, openAdminModule } from './helpers'

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

function localDateTime(daysFromNow: number) {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

test('Khuyến mãi: tạo, lọc, xem chi tiết, sửa, vô hiệu và kích hoạt lại', async ({ page }) => {
  const id = suffix()
  const code = `E2E${id}`
  const name = `Khuyến mãi Playwright ${id}`
  const updatedName = `${name} đã sửa`

  await loginAsAdmin(page)
  await openAdminModule(page, 'Khuyến mãi')
  await page.getByRole('button', { name: '+ Tạo khuyến mãi', exact: true }).first().click()

  let modal = page.locator('.promotion-form-modal')
  await modal.getByLabel(/Mã khuyến mãi/).fill(code)
  await modal.getByLabel(/Tên chương trình/).fill(name)
  await modal.locator('textarea').fill('Chương trình tạo bởi Playwright E2E.')
  await modal.locator('select').first().selectOption('Percent')
  await modal.getByLabel(/Phần trăm giảm/).fill('15')
  await modal.getByLabel(/Đơn tối thiểu/).fill('100000')
  await modal.getByLabel('Giảm tối đa', { exact: true }).fill('50000')
  await modal.getByLabel('Giới hạn lượt dùng', { exact: true }).fill('20')
  await modal.getByLabel(/Bắt đầu/).fill(localDateTime(-1))
  await modal.getByLabel(/Kết thúc/).fill(localDateTime(7))
  await modal.getByRole('button', { name: 'Tạo chương trình', exact: true }).click()

  const keyword = page.getByPlaceholder('Tìm theo mã, tên hoặc mô tả...')
  await keyword.fill(code)
  await page.getByRole('button', { name: 'Lọc', exact: true }).click()

  let card = page.locator('.promotion-card').filter({ hasText: code })
  await expect(card).toBeVisible()
  await expect(card).toContainText(name)
  await expect(card).toContainText('15%')
  await expect(card).toContainText('Đang hiệu lực')

  await card.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  const detail = page.locator('.promotion-detail-modal')
  await expect(detail).toContainText(code)
  await expect(detail).toContainText(name)
  await detail.getByRole('button', { name: 'Đóng', exact: true }).click()

  card = page.locator('.promotion-card').filter({ hasText: code })
  await card.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  modal = page.locator('.promotion-form-modal')
  await modal.getByLabel(/Tên chương trình/).fill(updatedName)
  await modal.getByLabel(/Phần trăm giảm/).fill('20')
  await modal.getByLabel('Giảm tối đa', { exact: true }).fill('75000')
  await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()

  card = page.locator('.promotion-card').filter({ hasText: code })
  await expect(card).toContainText(updatedName)
  await expect(card).toContainText('20%')
  await expect(card).toContainText('75.000')

  await card.getByRole('button', { name: 'Vô hiệu', exact: true }).click()
  await acceptConfirmDialog(page)
  card = page.locator('.promotion-card').filter({ hasText: code })
  await expect(card).toContainText('Đã vô hiệu')

  await card.getByRole('button', { name: 'Kích hoạt', exact: true }).click()
  await expect(page.locator('.promotion-card').filter({ hasText: code }))
    .toContainText('Đang hiệu lực')

  await page.getByRole('button', { name: /Lịch sử sử dụng/ }).click()
  await expect(page.locator('.promotion-usage-table')).toBeVisible()
  await page.getByRole('button', { name: /Chương trình khuyến mãi/ }).click()
  await expect(page.locator('.promotion-card').filter({ hasText: code })).toBeVisible()
})
