import { expect, test } from './fixtures'
import {
  acceptConfirmDialog,
  loginAsAdmin,
  openAdminModule,
  uniqueName,
} from './helpers'

test('Tạo món và quản lý vòng đời danh mục trên giao diện', async ({ page }) => {
  const categoryName = uniqueName('Danh mục Playwright')
  const itemName = uniqueName('Món Playwright')

  await loginAsAdmin(page)
  await openAdminModule(page, 'Thực đơn')

  await page.getByRole('button', { name: 'Danh mục', exact: true }).click()
  await page.getByRole('button', { name: '+ Thêm danh mục', exact: true }).click()

  const categoryModal = page.locator('.modal-backdrop .employee-modal')
  await expect(categoryModal.getByRole('heading', { name: 'Thêm danh mục', exact: true })).toBeVisible()
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

  const itemModal = page.locator('.modal-backdrop .employee-modal')
  await expect(itemModal.getByRole('heading', { name: 'Thêm món ăn', exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Danh mục', exact: true }).selectOption({ label: categoryName })
  await itemModal.getByLabel('Tên món', { exact: true }).fill(itemName)
  await itemModal.getByLabel('Giá bán', { exact: true }).fill('125000')
  await itemModal.getByLabel('Mô tả', { exact: true }).fill('Món ăn kiểm tra bằng Chromium.')
  await itemModal.getByRole('button', { name: 'Lưu món ăn', exact: true }).click()

  await expect(page.getByText('Tạo món ăn thành công.', { exact: true })).toBeVisible()
  const itemCard = page.locator('.menu-item-card').filter({ hasText: itemName })
  await expect(itemCard).toBeVisible()
  await expect(itemCard).toContainText(categoryName)
  await expect(itemCard).toContainText('125.000 ₫')

  await page.getByRole('button', { name: 'Danh mục', exact: true }).click()
  const categorySearch = page.getByPlaceholder('Tìm danh mục món...')
  await categorySearch.fill(categoryName)
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click()

  let categoryCard = page.locator('.category-card').filter({ hasText: categoryName })
  await categoryCard.getByRole('button', { name: 'Ngừng', exact: true }).click()
  await acceptConfirmDialog(page)
  await expect(page.getByText(
    'Ngừng hoạt động danh mục món ăn thành công.',
    { exact: true },
  )).toBeVisible()
  await expect(categoryCard).toHaveCount(0)

  const statusFilter = page.getByRole('combobox', { name: 'Trạng thái danh mục' })
  await statusFilter.selectOption('inactive')
  categoryCard = page.locator('.category-card').filter({ hasText: categoryName })
  await expect(categoryCard).toContainText('Ngừng hoạt động')
  await categoryCard.getByRole('button', { name: 'Kích hoạt lại', exact: true }).click()
  await acceptConfirmDialog(page)
  await expect(page.getByText(
    'Kích hoạt lại danh mục món ăn thành công.',
    { exact: true },
  )).toBeVisible()
  await expect(categoryCard).toHaveCount(0)

  await statusFilter.selectOption('active')
  categoryCard = page.locator('.category-card').filter({ hasText: categoryName })
  await expect(categoryCard).toContainText('Hoạt động')

  // Cleanup keeps E2E data out of the default active view.
  await categoryCard.getByRole('button', { name: 'Ngừng', exact: true }).click()
  await acceptConfirmDialog(page)
  await expect(categoryCard).toHaveCount(0)
})
