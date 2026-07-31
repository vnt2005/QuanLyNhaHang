import { expect, test } from './fixtures'
import { loginAsAdmin, openAdminModule } from './helpers'

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

test('Kho: danh mục, nguyên liệu, nhập, xuất, điều chỉnh, hoàn tác và vô hiệu', async ({ page }) => {
  const id = suffix()
  const categoryName = `Danh mục kho E2E ${id}`
  const categoryUpdated = `${categoryName} đã sửa`
  const ingredientCode = `NL-E2E-${id}`
  const ingredientName = `Nguyên liệu Playwright ${id}`
  const ingredientUpdated = `${ingredientName} đã sửa`

  await loginAsAdmin(page)
  await openAdminModule(page, 'Kho nguyên liệu')

  await page.getByRole('button', { name: '+ Danh mục', exact: true }).click()
  let modal = page.locator('.category-form-modal')
  await modal.getByLabel(/Tên danh mục/).fill(categoryName)
  await modal.getByLabel('Mô tả', { exact: true }).fill('Danh mục kho tạo bằng Playwright.')
  await modal.getByRole('button', { name: 'Thêm danh mục', exact: true }).click()

  let categoryRow = page.locator('.category-table tbody tr').filter({ hasText: categoryName })
  await expect(categoryRow).toBeVisible()
  await categoryRow.getByRole('button', { name: `Chỉnh sửa ${categoryName}`, exact: true }).click()
  modal = page.locator('.category-form-modal')
  await modal.getByLabel(/Tên danh mục/).fill(categoryUpdated)
  await modal.getByLabel('Mô tả', { exact: true }).fill('Danh mục kho đã cập nhật.')
  await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  categoryRow = page.locator('.category-table tbody tr').filter({ hasText: categoryUpdated })
  await expect(categoryRow).toContainText('Danh mục kho đã cập nhật.')

  await page.getByRole('button', { name: /Nguyên liệu/ }).first().click()
  await page.getByRole('button', { name: '+ Thêm nguyên liệu', exact: true }).click()
  modal = page.locator('.inventory-form-modal')
  await modal.getByLabel(/Mã nguyên liệu/).fill(ingredientCode)
  await modal.getByLabel(/Tên nguyên liệu/).fill(ingredientName)
  await modal.getByLabel(/Danh mục/).selectOption({ label: categoryUpdated })
  await modal.getByLabel(/Đơn vị tính/).fill('kg')
  await modal.getByLabel(/Tồn kho ban đầu/).fill('10')
  await modal.getByLabel(/Định mức tối thiểu/).fill('5')
  await modal.getByLabel(/Giá vốn/).fill('10000')
  await modal.getByLabel('Ghi chú', { exact: true }).fill('Nguyên liệu kiểm thử kho.')
  await modal.getByRole('button', { name: 'Thêm nguyên liệu', exact: true }).click()

  let ingredientRow = page.locator('tbody tr').filter({ hasText: ingredientCode })
  await expect(ingredientRow).toBeVisible()
  await expect(ingredientRow).toContainText(ingredientName)
  await expect(ingredientRow).toContainText('10')

  await ingredientRow.getByRole('button', { name: `Chỉnh sửa ${ingredientName}`, exact: true }).click()
  modal = page.locator('.inventory-form-modal')
  await modal.getByLabel(/Tên nguyên liệu/).fill(ingredientUpdated)
  await modal.getByLabel(/Định mức tối thiểu/).fill('6')
  await modal.getByLabel(/Giá vốn/).fill('12000')
  await modal.getByLabel('Ghi chú', { exact: true }).fill('Nguyên liệu kho đã sửa.')
  await modal.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()

  ingredientRow = page.locator('tbody tr').filter({ hasText: ingredientCode })
  await expect(ingredientRow).toContainText(ingredientUpdated)
  await expect(ingredientRow).toContainText('12.000')

  await ingredientRow.getByRole('button', { name: `Nhập kho ${ingredientUpdated}`, exact: true }).click()
  let transactionModal = page.locator('.transaction-form-modal')
  await transactionModal.getByLabel(/Số lượng/).fill('5')
  await transactionModal.getByLabel(/Đơn giá nhập/).fill('12000')
  await transactionModal.getByLabel('Ghi chú', { exact: true }).fill('Nhập kho Playwright.')
  await transactionModal.getByRole('button', { name: 'Xác nhận nhập kho', exact: true }).click()
  ingredientRow = page.locator('tbody tr').filter({ hasText: ingredientCode })
  await expect(ingredientRow).toContainText('15')

  await page.getByRole('button', { name: '⇄ Giao dịch kho', exact: true }).click()
  transactionModal = page.locator('.transaction-form-modal')
  await transactionModal.getByRole('button', { name: 'Xuất kho', exact: true }).click()
  await transactionModal.getByLabel(/Nguyên liệu/).selectOption({ label: new RegExp(ingredientCode) })
  await transactionModal.getByLabel(/Số lượng/).fill('3')
  await transactionModal.getByLabel('Ghi chú', { exact: true }).fill('Xuất kho Playwright.')
  await transactionModal.getByRole('button', { name: 'Xác nhận xuất kho', exact: true }).click()
  ingredientRow = page.locator('tbody tr').filter({ hasText: ingredientCode })
  await expect(ingredientRow).toContainText('12')

  await page.getByRole('button', { name: '⇄ Giao dịch kho', exact: true }).click()
  transactionModal = page.locator('.transaction-form-modal')
  await transactionModal.getByRole('button', { name: 'Điều chỉnh', exact: true }).click()
  await transactionModal.getByLabel(/Nguyên liệu/).selectOption({ label: new RegExp(ingredientCode) })
  await transactionModal.getByLabel(/Tồn kho mới/).fill('20')
  await transactionModal.getByLabel(/Đơn giá điều chỉnh/).fill('12000')
  await transactionModal.getByLabel('Ghi chú', { exact: true }).fill('Điều chỉnh Playwright.')
  await transactionModal.getByRole('button', { name: 'Xác nhận điều chỉnh', exact: true }).click()
  ingredientRow = page.locator('tbody tr').filter({ hasText: ingredientCode })
  await expect(ingredientRow).toContainText('20')

  await page.getByRole('button', { name: /Giao dịch kho/ }).first().click()
  const transactionRows = page.locator('.transaction-table tbody tr').filter({ hasText: ingredientCode })
  await expect(transactionRows).toHaveCount(3)
  const adjustmentRow = transactionRows.filter({ hasText: 'Điều chỉnh' })
  await expect(adjustmentRow).toContainText('12')
  await expect(adjustmentRow).toContainText('20')
  page.once('dialog', dialog => dialog.accept())
  await adjustmentRow.getByRole('button', { name: /Hủy / }).click()
  await expect(adjustmentRow).toContainText('Đã hủy')

  await page.getByRole('button', { name: /Nguyên liệu/ }).first().click()
  ingredientRow = page.locator('tbody tr').filter({ hasText: ingredientCode })
  await expect(ingredientRow).toContainText('12')
  page.once('dialog', dialog => dialog.accept())
  await ingredientRow.getByRole('button', { name: `Vô hiệu hóa ${ingredientUpdated}`, exact: true }).click()
  await expect(page.locator('tbody tr').filter({ hasText: ingredientCode })).toContainText('Đã vô hiệu')

  await page.getByRole('button', { name: /Danh mục/ }).first().click()
  categoryRow = page.locator('.category-table tbody tr').filter({ hasText: categoryUpdated })
  page.once('dialog', dialog => dialog.accept())
  await categoryRow.getByRole('button', { name: `Vô hiệu hóa ${categoryUpdated}`, exact: true }).click()
  await expect(page.locator('.category-table tbody tr').filter({ hasText: categoryUpdated }))
    .toContainText('Đã vô hiệu')
})
