import { expect, test } from './fixtures'
import {
  bearerHeaders,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

async function selectOptionContaining(
  select: ReturnType<import('@playwright/test').Page['locator']>,
  text: string,
) {
  const option = select.locator('option').filter({ hasText: text }).first()
  await expect(option).toBeAttached()
  const value = await option.getAttribute('value')
  expect(value, `Không tìm thấy option chứa “${text}”.`).toBeTruthy()
  await select.selectOption(value ?? '')
}

test('Đơn hàng → bếp → thanh toán → hóa đơn → báo cáo doanh thu', async ({ page, request }) => {
  const id = suffix()
  const areaName = `Khu vận hành E2E ${id}`
  const tableName = `Bàn vận hành E2E ${id}`
  const categoryName = `Danh mục vận hành E2E ${id}`
  const menuItemName = `Món vận hành E2E ${id}`
  const orderNote = `Đơn vận hành Playwright ${id}`
  const paymentNote = `Thanh toán Playwright ${id}`
  const reportNote = `Báo cáo Playwright ${id}`
  const itemPrice = 120000

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: { name: areaName, description: 'Dữ liệu nền cho luồng vận hành E2E.' },
  })
  expect(areaResponse.status()).toBe(200)
  const area = await areaResponse.json() as { id: string }

  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers,
    data: { areaId: area.id, name: tableName, capacity: 6, note: 'Bàn E2E.' },
  })
  expect(tableResponse.status()).toBe(200)

  const categoryResponse = await request.post(`${apiURL}/api/MenuCategories`, {
    headers,
    data: {
      name: categoryName,
      description: 'Danh mục E2E.',
      displayOrder: 99,
    },
  })
  expect(categoryResponse.status()).toBe(200)
  const category = await categoryResponse.json() as { id: string }

  const menuItemResponse = await request.post(`${apiURL}/api/MenuItems`, {
    headers,
    data: {
      menuCategoryId: category.id,
      name: menuItemName,
      description: 'Món dùng cho luồng vận hành.',
      price: itemPrice,
      imageUrl: null,
    },
  })
  expect(menuItemResponse.status()).toBe(200)

  await openAdminModule(page, 'Đơn hàng')
  await page.getByRole('button', { name: '+ Tạo đơn hàng', exact: true }).click()
  const orderModal = page.locator('.order-modal')
  await selectOptionContaining(orderModal.getByLabel('Bàn', { exact: true }), tableName)
  await orderModal.getByLabel('Ghi chú', { exact: true }).fill(orderNote)
  await orderModal.getByRole('button', { name: '+ Thêm món', exact: true }).click()
  const orderLine = orderModal.locator('.order-line').first()
  await selectOptionContaining(orderLine.locator('select'), menuItemName)
  await orderLine.locator('input[type="number"]').fill('2')
  await orderLine.getByPlaceholder('Ghi chú món').fill('Ít cay E2E')
  await orderModal.getByRole('button', { name: 'Tạo đơn', exact: true }).click()

  let orderCard = page.locator('.order-card').filter({ hasText: orderNote })
  await expect(orderCard).toBeVisible()
  await expect(orderCard).toContainText(tableName)
  await expect(orderCard).toContainText('240.000')
  await expect(orderCard).toContainText('Chờ xử lý')
  const orderCode = (await orderCard.locator('.order-card-head strong').textContent())?.trim() ?? ''
  expect(orderCode).not.toBe('')

  await orderCard.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  const orderDetail = page.locator('.order-detail-modal')
  await expect(orderDetail).toContainText(menuItemName)
  await expect(orderDetail).toContainText('Ít cay E2E')
  await orderDetail.getByPlaceholder('Ghi chú đơn hàng').fill(`${orderNote} đã cập nhật`)
  await orderDetail.getByRole('button', { name: 'Lưu ghi chú', exact: true }).click()
  await orderDetail.getByRole('button', { name: '×', exact: true }).first().click()

  await openAdminModule(page, 'Bếp')
  let ticket = page.locator('.kitchen-ticket').filter({ hasText: orderCode })
    .filter({ hasText: menuItemName })
  await expect(ticket).toBeVisible()
  await expect(ticket).toContainText('2 ×')

  page.once('dialog', dialog => dialog.accept())
  await ticket.getByRole('button', { name: 'Bắt đầu nấu', exact: true }).click()
  ticket = page.locator('.kitchen-ticket').filter({ hasText: orderCode })
  await expect(ticket).toContainText('Đang nấu')

  page.once('dialog', dialog => dialog.accept())
  await ticket.getByRole('button', { name: 'Hoàn thành', exact: true }).click()
  ticket = page.locator('.kitchen-ticket').filter({ hasText: orderCode })
  await expect(ticket).toContainText('Hoàn thành')

  page.once('dialog', dialog => dialog.accept())
  await ticket.getByRole('button', { name: 'Đã giao món', exact: true }).click()
  await page.getByRole('button', { name: 'Lịch sử', exact: true }).click()
  await expect(page.locator('.history-order').filter({ hasText: orderCode }))
    .toContainText('Đã phục vụ')

  await openAdminModule(page, 'Đơn hàng')
  orderCard = page.locator('.order-card').filter({ hasText: orderCode })
  await expect(orderCard).toContainText('Đã phục vụ')

  await openAdminModule(page, 'Thanh toán')
  await page.getByRole('button', { name: '+ Thanh toán mới', exact: true }).click()
  const paymentModal = page.locator('.payment-modal')
  await selectOptionContaining(
    paymentModal.getByLabel('Đơn hàng', { exact: true }),
    orderCode,
  )
  await paymentModal.getByLabel('Giảm giá', { exact: true }).fill('10000')
  await paymentModal.getByLabel('VAT', { exact: true }).fill('5000')
  await paymentModal.getByLabel('Khách đưa', { exact: true }).fill('300000')
  await paymentModal.getByLabel('Phương thức', { exact: true }).selectOption('Cash')
  await paymentModal.getByLabel('Ghi chú', { exact: true }).fill(paymentNote)
  await paymentModal.getByLabel('Tự động xuất hóa đơn sau thanh toán', { exact: true }).check()
  await expect(paymentModal.locator('.payment-preview')).toContainText('235.000')
  await paymentModal.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click()

  const paymentRow = page.locator('.payment-table tbody tr').filter({ hasText: paymentNote })
  await expect(paymentRow).toBeVisible()
  await expect(paymentRow).toContainText('235.000')
  await expect(paymentRow).toContainText('Đã thanh toán')
  const paymentCode = (await paymentRow.locator('td').first().locator('strong').textContent())?.trim() ?? ''
  expect(paymentCode).not.toBe('')

  await openAdminModule(page, 'Hóa đơn')
  const invoiceSearch = page.getByPlaceholder('Tìm mã hóa đơn, đơn, thanh toán hoặc bàn...')
  await invoiceSearch.fill(paymentCode)
  await page.getByRole('button', { name: 'Lọc', exact: true }).click()
  let invoiceRow = page.locator('.invoice-table tbody tr').filter({ hasText: paymentCode })
  await expect(invoiceRow).toBeVisible()
  await expect(invoiceRow).toContainText(orderCode)
  await expect(invoiceRow).toContainText(tableName)
  await expect(invoiceRow).toContainText('235.000')
  await expect(invoiceRow).toContainText('Đã phát hành')

  await invoiceRow.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  let invoiceDetail = page.locator('.invoice-detail-modal')
  await expect(invoiceDetail).toContainText(menuItemName)
  await expect(invoiceDetail).toContainText('2')
  await expect(invoiceDetail).toContainText('235.000')
  await invoiceDetail.getByRole('button', { name: 'Đóng', exact: true }).click()

  invoiceRow = page.locator('.invoice-table tbody tr').filter({ hasText: paymentCode })
  page.once('dialog', dialog => dialog.accept())
  await invoiceRow.getByRole('button', { name: 'Đã in', exact: true }).click()
  await expect(page.locator('.invoice-table tbody tr').filter({ hasText: paymentCode }))
    .toContainText('Đã in')

  await openAdminModule(page, 'Báo cáo doanh thu')
  await expect(page.locator('.revenue-summary-grid')).toContainText('1')
  await expect(page.locator('.revenue-insights-grid')).toContainText(menuItemName)
  await page.getByRole('button', { name: '+ Tạo báo cáo', exact: true }).click()
  const reportModal = page.locator('.revenue-form-modal')
  await reportModal.getByLabel('Ghi chú', { exact: true }).fill(reportNote)
  await reportModal.getByRole('button', { name: 'Tạo báo cáo', exact: true }).click()

  const reportDetail = page.locator('.revenue-detail-modal, .revenue-report-detail-modal')
  if (await reportDetail.count()) {
    await expect(reportDetail).toContainText(reportNote)
    await expect(reportDetail).toContainText(menuItemName)
    await reportDetail.getByRole('button', { name: 'Đóng', exact: true }).click()
  }
  const reportRow = page.locator('.revenue-report-table tbody tr').filter({ hasText: reportNote })
  if (await reportRow.count()) {
    await expect(reportRow).toContainText('1 hóa đơn')
  }
})
