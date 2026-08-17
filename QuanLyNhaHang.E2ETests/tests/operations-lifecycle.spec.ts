import { expect, test } from './fixtures'
import {
  acceptConfirmDialog,
  bearerHeaders,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

const apiURL = (process.env.E2E_API_URL ?? 'http://localhost:8080')
  .replace(/\/$/, '')

function suffix() {
  return `${Date.now()}${Math.floor(Math.random() * 10_000)}`
}

function inputDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

async function selectOptionContaining(
  select: ReturnType<import('@playwright/test').Page['locator']>,
  text: string,
) {
  let value = ''

  await expect.poll(async () => {
    value = await select.locator('option').evaluateAll((options, expected) => (
      options.find(option => option.textContent?.includes(expected as string)) as HTMLOptionElement | undefined
    )?.value ?? '', text)
    return value
  }, {
    message: `Không tìm thấy option chứa “${text}”.`,
    timeout: 20_000,
  }).not.toBe('')

  await select.selectOption(value)
  await expect(select).toHaveValue(value)
}

async function expectModalLayout(
  page: import('@playwright/test').Page,
  modal: ReturnType<import('@playwright/test').Page['locator']>,
) {
  await expect(modal).toBeVisible()

  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error('Playwright chưa cấu hình viewport để kiểm tra modal.')
  }

  const layout = await modal.evaluate(element => {
    const modalRect = element.getBoundingClientRect()
    const form = element.querySelector('form')
    const actions = element.querySelector('.modal-actions')
    const formStyle = form ? window.getComputedStyle(form) : null
    const actionsRect = actions?.getBoundingClientRect()

    return {
      left: modalRect.left,
      top: modalRect.top,
      right: modalRect.right,
      bottom: modalRect.bottom,
      paddingLeft: Number.parseFloat(formStyle?.paddingLeft ?? '0'),
      paddingRight: Number.parseFloat(formStyle?.paddingRight ?? '0'),
      actionsTop: actionsRect?.top ?? null,
      actionsBottom: actionsRect?.bottom ?? null,
    }
  })

  expect(layout.left).toBeGreaterThanOrEqual(0)
  expect(layout.top).toBeGreaterThanOrEqual(0)
  expect(layout.right).toBeLessThanOrEqual(viewport.width + 1)
  expect(layout.bottom).toBeLessThanOrEqual(viewport.height + 1)
  expect(layout.paddingLeft).toBeGreaterThanOrEqual(16)
  expect(layout.paddingRight).toBeGreaterThanOrEqual(16)

  if (layout.actionsTop === null || layout.actionsBottom === null) {
    throw new Error('Không tìm thấy vùng nút thao tác trong modal.')
  }

  expect(layout.actionsTop).toBeGreaterThanOrEqual(layout.top)
  expect(layout.actionsBottom).toBeLessThanOrEqual(layout.bottom + 1)
}

test('Đơn hàng → bếp → thanh toán → hóa đơn → báo cáo doanh thu', async ({ page, request }) => {
  const id = suffix()
  const areaName = `Khu vận hành E2E ${id}`
  const tableName = `Bàn vận hành E2E ${id}`
  const categoryName = `Danh mục vận hành E2E ${id}`
  const menuItemName = `Món vận hành E2E ${id}`
  const orderNote = `Đơn vận hành Playwright ${id}`
  const paymentNote = `Thanh toán Playwright ${id}`
  const promotionCode = `E2E-${id}`
  const promotionName = `Khuyến mãi Playwright ${id}`
  const reportNote = `Báo cáo Playwright ${id}`
  const itemPrice = 120000
  const promotionDiscount = 24000
  const now = new Date()
  const reportFrom = inputDate(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  const reportTo = inputDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: { name: areaName, description: 'Dữ liệu nền cho luồng vận hành E2E.' },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }

  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers,
    data: { areaId: area.id, name: tableName, capacity: 6, note: 'Bàn E2E.' },
  })
  expect(tableResponse.ok()).toBeTruthy()
  const table = await tableResponse.json() as { id: string }

  const categoryResponse = await request.post(`${apiURL}/api/MenuCategories`, {
    headers,
    data: {
      name: categoryName,
      description: 'Danh mục E2E.',
      displayOrder: 99,
    },
  })
  expect(categoryResponse.ok()).toBeTruthy()
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
  expect(menuItemResponse.ok()).toBeTruthy()
  const menuItem = await menuItemResponse.json() as { id: string }

  await page.setViewportSize({ width: 1180, height: 560 })
  await openAdminModule(page, 'Đơn hàng')
  await page.getByRole('button', { name: '+ Tạo đơn hàng', exact: true }).click()
  const orderModal = page.locator('.order-modal')
  await expectModalLayout(page, orderModal)
  await orderModal.locator('.modal-heading')
    .getByRole('button', { name: 'Đóng', exact: true })
    .click()
  await expect(orderModal).toHaveCount(0)
  await page.setViewportSize({ width: 1440, height: 900 })

  const createOrderResponse = await request.post(`${apiURL}/api/Orders`, {
    headers,
    data: {
      restaurantTableId: table.id,
      note: orderNote,
      items: [{ menuItemId: menuItem.id, quantity: 2, note: 'Ít cay E2E' }],
    },
  })
  expect(createOrderResponse.ok()).toBeTruthy()
  const createdOrder = await createOrderResponse.json() as { id: string }

  const orderSearch = page.getByPlaceholder(/Tìm mã đơn, bàn.*ghi chú/)
  await orderSearch.fill(orderNote)
  await page.getByRole('button', { name: 'Lọc', exact: true }).click()

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
  await orderDetail.locator('.modal-heading')
    .getByRole('button', { name: 'Đóng', exact: true })
    .click()

  await openAdminModule(page, 'Bếp')
  let ticket = page.locator('.kitchen-ticket').filter({ hasText: orderCode })
    .filter({ hasText: menuItemName })
  await expect(ticket).toBeVisible()
  await expect(ticket).toContainText('2 ×')

  await ticket.getByRole('button', { name: 'Bắt đầu nấu', exact: true }).click()
  await acceptConfirmDialog(page)
  ticket = page.locator('.kitchen-ticket').filter({ hasText: orderCode })
  await expect(ticket).toContainText('Đang nấu')

  await ticket.getByRole('button', { name: 'Hoàn thành', exact: true }).click()
  await acceptConfirmDialog(page)
  ticket = page.locator('.kitchen-ticket').filter({ hasText: orderCode })
  await expect(ticket).toContainText('Xong')

  await ticket.getByRole('button', { name: 'Đã giao món', exact: true }).click()
  await acceptConfirmDialog(page)
  await page.getByRole('button', { name: 'Lịch sử', exact: true }).click()
  await expect(page.locator('.history-order').filter({ hasText: orderCode }))
    .toContainText('Đã phục vụ')

  await openAdminModule(page, 'Đơn hàng')
  await page.getByPlaceholder(/Tìm mã đơn, bàn.*ghi chú/).fill(orderCode)
  await page.getByRole('button', { name: 'Lọc', exact: true }).click()
  orderCard = page.locator('.order-card').filter({ hasText: orderCode })
  await expect(orderCard).toContainText('Đã phục vụ')

  const servedResponse = await request.get(
    `${apiURL}/api/Orders/paginated?keyword=${encodeURIComponent(orderCode)}&status=Served&isActive=true&pageNumber=1&pageSize=10`,
    { headers },
  )
  expect(servedResponse.ok()).toBeTruthy()
  const servedOrders = await servedResponse.json() as {
    items: Array<{ orderCode: string; status: string }>
  }
  expect(servedOrders.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ orderCode, status: 'Served' }),
    ]),
  )

  const promotionResponse = await request.post(`${apiURL}/api/promotions`, {
    headers,
    data: {
      promotionCode,
      name: promotionName,
      description: 'Kiểm tra khuyến mãi được chuyển sang thanh toán.',
      discountType: 'Percent',
      discountValue: 10,
      minimumOrderAmount: 0,
      maximumDiscountAmount: 50000,
      startDate: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 20,
    },
  })
  expect(promotionResponse.ok()).toBeTruthy()

  await page.setViewportSize({ width: 960, height: 822 })
  await openAdminModule(page, 'Thanh toán')
  await page.getByRole('button', { name: '+ Thanh toán mới', exact: true }).click()
  const paymentModal = page.locator('.payment-modal')
  await expectModalLayout(page, paymentModal)
  await selectOptionContaining(paymentModal.locator('select').first(), orderCode)
  const promotionCodeInput = paymentModal.getByLabel('Mã khuyến mãi', { exact: true })
  await promotionCodeInput.fill(promotionCode)
  await paymentModal.getByRole('button', { name: 'Áp dụng', exact: true }).click()
  await expect(paymentModal.getByRole('button', { name: 'Gỡ mã', exact: true })).toBeVisible()
  await expect(promotionCodeInput).toHaveValue(promotionCode)
  await expect(promotionCodeInput).not.toBeEditable()
  const discountInput = paymentModal.getByLabel('Giảm giá', { exact: true })
  await expect(discountInput).toHaveValue(String(promotionDiscount))
  await expect(discountInput).not.toBeEditable()
  await expect(paymentModal).toContainText(`Đã áp dụng mã ${promotionCode}`)
  await paymentModal.getByLabel(/^Phí phục vụ/).fill('3000')
  await paymentModal.getByLabel(/^VAT/).fill('5000')
  await paymentModal.getByLabel('Khách đưa', { exact: true }).fill('300000')
  await paymentModal.locator('select').nth(1).selectOption('Cash')
  await paymentModal.locator('textarea').fill(paymentNote)
  await paymentModal.getByLabel('Tự động xuất hóa đơn sau thanh toán', { exact: true }).check()
  await expect(paymentModal.locator('.payment-preview')).toContainText('Phí phục vụ')
  await expect(paymentModal.locator('.payment-preview')).toContainText('3.000')
  await expect(paymentModal.locator('.payment-preview')).toContainText(promotionCode)
  await expect(paymentModal.locator('.payment-preview')).toContainText('224.000')
  await paymentModal.getByRole('button', { name: 'Xác nhận thanh toán', exact: true }).click()
  await expect(paymentModal).toHaveCount(0)
  await page.setViewportSize({ width: 1440, height: 900 })

  const paymentRow = page.locator('.payment-table tbody tr').filter({ hasText: paymentNote })
  await expect(paymentRow).toBeVisible()
  await expect(paymentRow).toContainText('224.000')
  await expect(paymentRow).toContainText('Đã thanh toán')
  const paymentCode = (await paymentRow.locator('td').first().locator('strong').textContent())?.trim() ?? ''
  expect(paymentCode).not.toBe('')

  const promotionUsagesResponse = await request.get(
    `${apiURL}/api/promotion-usages?orderId=${createdOrder.id}&status=Applied`,
    { headers },
  )
  expect(promotionUsagesResponse.ok()).toBeTruthy()
  const promotionUsages = await promotionUsagesResponse.json() as Array<{
    promotionCode: string
    discountAmount: number
    paymentCode: string | null
  }>
  expect(promotionUsages).toEqual([
    expect.objectContaining({
      promotionCode,
      discountAmount: promotionDiscount,
      paymentCode,
    }),
  ])

  await openAdminModule(page, 'Hóa đơn')
  const invoiceSearch = page.getByPlaceholder('Tìm mã hóa đơn, đơn, thanh toán hoặc bàn...')
  await invoiceSearch.fill(paymentCode)
  await page.getByRole('button', { name: 'Lọc', exact: true }).click()
  let invoiceRow = page.locator('.invoice-table tbody tr').filter({ hasText: paymentCode })
  await expect(invoiceRow).toBeVisible()
  await expect(invoiceRow).toContainText(orderCode)
  await expect(invoiceRow).toContainText(tableName)
  await expect(invoiceRow).toContainText('224.000')
  await expect(invoiceRow).toContainText('Đã phát hành')

  await invoiceRow.getByRole('button', { name: 'Chi tiết', exact: true }).click()
  const invoiceDetail = page.locator('.invoice-detail-modal')
  await expect(invoiceDetail).toContainText(menuItemName)
  await expect(invoiceDetail).toContainText('2')
  await expect(invoiceDetail).toContainText('Phí phục vụ')
  await expect(invoiceDetail).toContainText('3.000')
  await expect(invoiceDetail).toContainText('224.000')
  await invoiceDetail.getByRole('button', { name: 'Đóng', exact: true }).click()

  invoiceRow = page.locator('.invoice-table tbody tr').filter({ hasText: paymentCode })
  await invoiceRow.getByRole('button', { name: 'Đã in', exact: true }).click()
  await acceptConfirmDialog(page)
  await expect(page.locator('.invoice-table tbody tr').filter({ hasText: paymentCode }))
    .toContainText('Đã in')

  const refreshedInvoiceDetail = page.locator('.invoice-detail-modal')
  await expect(refreshedInvoiceDetail).toBeVisible()
  await refreshedInvoiceDetail.getByRole('button', { name: 'Đóng', exact: true }).click()
  await expect(refreshedInvoiceDetail).toHaveCount(0)

  await openAdminModule(page, 'Báo cáo doanh thu')
  const periodForm = page.locator('.revenue-period-card')
  await periodForm.locator('input[type="date"]').nth(0).fill(reportFrom)
  await periodForm.locator('input[type="date"]').nth(1).fill(reportTo)
  await periodForm.getByRole('button', { name: 'Xem báo cáo', exact: true }).click()
  await expect(page.locator('.revenue-summary-grid')).toContainText('1')
  await expect(page.locator('.revenue-insights-grid')).toContainText(menuItemName)

  const existingReportsResponse = await request.get(
    `${apiURL}/api/revenue-reports/paginated?fromDate=${encodeURIComponent(reportFrom)}&toDate=${encodeURIComponent(reportTo)}&pageNumber=1&pageSize=100`,
    { headers },
  )
  expect(existingReportsResponse.ok()).toBeTruthy()
  const existingReports = await existingReportsResponse.json() as {
    items: Array<{ id: string; fromDate: string; toDate: string; status: string }>
  }
  for (const report of existingReports.items) {
    if (
      report.fromDate.slice(0, 10) === reportFrom
      && report.toDate.slice(0, 10) === reportTo
      && report.status !== 'Cancelled'
    ) {
      const cancelResponse = await request.delete(
        `${apiURL}/api/revenue-reports/${report.id}`,
        { headers },
      )
      expect(cancelResponse.ok()).toBeTruthy()
    }
  }

  await page.getByRole('button', { name: '+ Tạo báo cáo', exact: true }).click()
  const reportModal = page.locator('.revenue-form-modal')
  await reportModal.locator('input[type="date"]').nth(0).fill(reportFrom)
  await reportModal.locator('input[type="date"]').nth(1).fill(reportTo)
  await reportModal.locator('textarea').fill(reportNote)
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