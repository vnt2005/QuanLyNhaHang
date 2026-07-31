import { expect, test } from './fixtures'
import { loginAsAdmin, openAdminModule, uniqueName } from './helpers'

test('Tạo danh mục và món ăn phải hiển thị ngay trên giao diện', async ({ page }) => {
  const categoryName = uniqueName('Danh mục Playwright')
  const itemName = uniqueName('Món Playwright')

  await loginAsAdmin(page)
  await openAdminModule(page, 'Thực đơn')

  await page.getByRole('button', { name: 'Danh mục', exact: true }).click()
  await page.getByRole('button', { name: '+ Thêm danh mục', exact: true }).click()

  const categoryModal = page.locator('.employee-modal').filter({
    has: page.getByRole('heading', { name: 'Thêm danh mục', exact: true }),
  })
  await categoryModal.getByLabel('Tên danh mục', { exact: true }).fill(categoryName)
  await categoryModal.getByLabel('Thứ tự hiển thị', { exact: true }).fill('20')
  await categoryModal.getByLabel('Mô tả', { exact: true }).fill('Danh mục tạo bởi Playwright E2E.')
  await categoryModal.getByRole('button', { name: 'Lưu danh mục', exact: true }).click()

  await expect(
    page.getByText('Tạo danh mục món ăn thành công.', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.category-card').filter({ hasText: categoryName })).toBeVisible()

  await page.getByRole('button', { name: 'Món ăn', exact: true }).click()
  await page.getByRole('button', { name: '+ Thêm món ăn', exact: true }).click()

  const itemModal = page.locator('.employee-modal').filter({
    has: page.getByRole('heading', { name: 'Thêm món ăn', exact: true }),
  })
  await itemModal.getByLabel('Danh mục', { exact: true }).selectOption({ label: categoryName })
  await itemModal.getByLabel('Tên món', { exact: true }).fill(itemName)
  await itemModal.getByLabel('Giá bán', { exact: true }).fill('125000')
  await itemModal.getByLabel('Mô tả', { exact: true }).fill('Món ăn kiểm tra bằng Chromium.')
  await itemModal.getByRole('button', { name: 'Lưu món ăn', exact: true }).click()

  await expect(page.getByText('Tạo món ăn thành công.', { exact: true })).toBeVisible()
  const itemCard = page.locator('.menu-item-card').filter({ hasText: itemName })
  await expect(itemCard).toBeVisible()
  await expect(itemCard).toContainText(categoryName)
  await expect(itemCard).toContainText('125.000 ₫')
})
