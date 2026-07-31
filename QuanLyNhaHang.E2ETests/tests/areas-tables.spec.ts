import { expect, test } from './fixtures'
import { loginAsAdmin, openAdminModule, uniqueName } from './helpers'

test('Tạo khu vực và bàn phải hiển thị ngay trên giao diện', async ({ page }) => {
  const areaName = uniqueName('Khu vực Playwright')
  const tableName = uniqueName('Bàn Playwright')

  await loginAsAdmin(page)
  await openAdminModule(page, 'Khu vực & bàn')

  await page.getByRole('button', { name: 'Khu vực', exact: true }).click()
  await page.getByRole('button', { name: '+ Thêm khu vực', exact: true }).click()

  const areaModal = page.locator('.employee-modal').filter({
    has: page.getByRole('heading', { name: 'Thêm khu vực', exact: true }),
  })
  await areaModal.getByLabel('Tên khu vực', { exact: true }).fill(areaName)
  await areaModal.getByLabel('Mô tả', { exact: true }).fill('Dữ liệu tạo bởi Playwright E2E.')
  await areaModal.getByRole('button', { name: 'Lưu khu vực', exact: true }).click()

  await expect(page.getByText('Tạo khu vực thành công.', { exact: true })).toBeVisible()
  await expect(page.locator('.area-card').filter({ hasText: areaName })).toBeVisible()

  await page.getByRole('button', { name: 'Bàn', exact: true }).click()
  await page.getByRole('button', { name: '+ Thêm bàn', exact: true }).click()

  const tableModal = page.locator('.employee-modal').filter({
    has: page.getByRole('heading', { name: 'Thêm bàn', exact: true }),
  })
  await tableModal.getByLabel('Khu vực', { exact: true }).selectOption({ label: areaName })
  await tableModal.getByLabel('Tên bàn', { exact: true }).fill(tableName)
  await tableModal.getByLabel('Sức chứa', { exact: true }).fill('4')
  await tableModal.getByLabel('Ghi chú', { exact: true }).fill('Bàn kiểm thử hiển thị sau khi tạo.')
  await tableModal.getByRole('button', { name: 'Lưu bàn', exact: true }).click()

  await expect(page.getByText('Tạo bàn thành công.', { exact: true })).toBeVisible()
  const tableCard = page.locator('.restaurant-table-card').filter({ hasText: tableName })
  await expect(tableCard).toBeVisible()
  await expect(tableCard).toContainText(areaName)
  await expect(tableCard).toContainText('4 chỗ')
})
