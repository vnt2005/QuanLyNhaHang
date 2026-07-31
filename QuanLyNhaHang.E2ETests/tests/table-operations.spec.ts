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

async function selectOptionValue(
  select: ReturnType<import('@playwright/test').Page['locator']>,
  value: string,
  label: string,
) {
  await expect(select, `Không tìm thấy ${label}.`).toBeVisible()
  await select.selectOption(value)
  await expect(select).toHaveValue(value)
}

type OperationHistoryItem = {
  operationType: string
  sourceTableName: string
  targetTableName: string
  note: string
  details?: Array<{ menuItemName: string; quantity: number }>
}

async function waitForOperationHistory(
  request: import('@playwright/test').APIRequestContext,
  headers: Record<string, string>,
  note: string,
) {
  let matched: OperationHistoryItem | undefined

  await expect.poll(async () => {
    const response = await request.get(
      `${apiURL}/api/table-operations/paginated?pageNumber=1&pageSize=100`,
      { headers },
    )
    if (!response.ok()) return false

    const body = await response.json() as { items: OperationHistoryItem[] }
    matched = body.items.find(item => item.note === note)
    return Boolean(matched)
  }, {
    message: `Không tìm thấy lịch sử thao tác “${note}”.`,
    timeout: 20_000,
  }).toBeTruthy()

  return matched!
}

test('Điều phối bàn: chuyển, tách rồi gộp order và lưu lịch sử', async ({ page, request }) => {
  const id = suffix()
  const areaName = `Khu điều phối E2E ${id}`
  const tableA = `Bàn nguồn E2E ${id}`
  const tableB = `Bàn gộp E2E ${id}`
  const tableC = `Bàn trống tách E2E ${id}`
  const tableD = `Bàn trống chuyển E2E ${id}`
  const menuItemName = `Món điều phối E2E ${id}`
  const transferNote = `Chuyển bàn Playwright ${id}`
  const splitOrderNote = `Order tách ${id}`
  const splitNote = `Tách bàn Playwright ${id}`
  const mergeNote = `Gộp bàn Playwright ${id}`

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: { name: areaName, description: 'Khu điều phối Playwright.' },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }

  const createTable = async (name: string) => {
    const response = await request.post(`${apiURL}/api/RestaurantTables`, {
      headers,
      data: { areaId: area.id, name, capacity: 6, note: 'Bàn điều phối E2E.' },
    })
    expect(response.ok()).toBeTruthy()
    return await response.json() as { id: string }
  }

  const [sourceTable, mergeTable, splitTargetTable, transferTargetTable] = await Promise.all([
    createTable(tableA),
    createTable(tableB),
    createTable(tableC),
    createTable(tableD),
  ])

  const categoryResponse = await request.post(`${apiURL}/api/MenuCategories`, {
    headers,
    data: { name: `Danh mục điều phối ${id}`, description: null, displayOrder: 100 },
  })
  expect(categoryResponse.ok()).toBeTruthy()
  const category = await categoryResponse.json() as { id: string }
  const menuResponse = await request.post(`${apiURL}/api/MenuItems`, {
    headers,
    data: {
      menuCategoryId: category.id,
      name: menuItemName,
      description: null,
      price: 50000,
      imageUrl: null,
    },
  })
  expect(menuResponse.ok()).toBeTruthy()
  const menuItem = await menuResponse.json() as { id: string }

  const sourceOrderResponse = await request.post(`${apiURL}/api/Orders`, {
    headers,
    data: {
      restaurantTableId: sourceTable.id,
      note: `Order nguồn ${id}`,
      items: [{ menuItemId: menuItem.id, quantity: 4, note: '4 phần để tách.' }],
    },
  })
  expect(sourceOrderResponse.ok()).toBeTruthy()
  const sourceOrder = await sourceOrderResponse.json() as { id: string }

  const targetOrderResponse = await request.post(`${apiURL}/api/Orders`, {
    headers,
    data: {
      restaurantTableId: mergeTable.id,
      note: `Order đích ${id}`,
      items: [{ menuItemId: menuItem.id, quantity: 1, note: 'Order giữ lại.' }],
    },
  })
  expect(targetOrderResponse.ok()).toBeTruthy()
  const targetOrder = await targetOrderResponse.json() as { id: string }

  await openAdminModule(page, 'Chuyển / gộp / tách bàn')
  const form = page.locator('.operation-form-card')

  await page.getByRole('button', { name: /Chuyển bàn$/ }).click()
  await selectOptionValue(
    form.locator('select').nth(0),
    sourceOrder.id,
    'order nguồn cần chuyển',
  )
  await selectOptionValue(
    form.locator('select').nth(1),
    transferTargetTable.id,
    'bàn đích cần chuyển',
  )
  await form.getByLabel('Ghi chú thao tác', { exact: true }).fill(transferNote)
  await form.getByRole('button', { name: 'Xác nhận chuyển bàn', exact: true }).click()
  await expect(page.getByText(/Chuyển bàn.*thành công/i)).toBeVisible()

  const transferHistory = await waitForOperationHistory(request, headers, transferNote)
  expect(transferHistory).toMatchObject({
    operationType: 'Transfer',
    sourceTableName: tableA,
    targetTableName: tableD,
    note: transferNote,
  })

  await page.getByRole('button', { name: /Tách bàn$/ }).click()
  await selectOptionValue(
    form.locator('select').nth(0),
    sourceOrder.id,
    'order nguồn cần tách',
  )
  await selectOptionValue(
    form.locator('select').nth(1),
    splitTargetTable.id,
    'bàn đích cần tách',
  )
  const splitItem = form.locator('.split-item-row').filter({ hasText: menuItemName })
  await expect(splitItem).toBeVisible()
  await selectOptionValue(
    splitItem.locator('select'),
    '2',
    'ô chọn số lượng món cần tách',
  )
  await form.getByLabel('Ghi chú cho order mới', { exact: true }).fill(splitOrderNote)
  await form.getByLabel('Ghi chú thao tác', { exact: true }).fill(splitNote)
  await form.getByRole('button', { name: 'Xác nhận tách bàn', exact: true }).click()
  await expect(page.getByText(/Tách bàn.*thành công/i)).toBeVisible()

  const splitHistory = await waitForOperationHistory(request, headers, splitNote)
  expect(splitHistory.operationType).toBe('Split')
  expect(splitHistory.sourceTableName).toBe(tableD)
  expect(splitHistory.targetTableName).toBe(tableC)
  expect(splitHistory.details).toEqual(
    expect.arrayContaining([expect.objectContaining({ menuItemName, quantity: 2 })]),
  )

  let splitOrderId = ''
  await expect.poll(async () => {
    const response = await request.get(
      `${apiURL}/api/Orders/paginated?keyword=${encodeURIComponent(splitOrderNote)}&isActive=true&pageNumber=1&pageSize=10`,
      { headers },
    )
    if (!response.ok()) return ''
    const body = await response.json() as { items: Array<{ id: string; note?: string | null }> }
    splitOrderId = body.items.find(order => order.note === splitOrderNote)?.id ?? ''
    return splitOrderId
  }).not.toBe('')

  await page.getByRole('button', { name: /Gộp bàn$/ }).click()
  await selectOptionValue(
    form.locator('select').nth(0),
    splitOrderId,
    'order nguồn cần gộp',
  )
  await selectOptionValue(
    form.locator('select').nth(1),
    targetOrder.id,
    'order đích giữ lại',
  )
  await form.getByLabel('Ghi chú thao tác', { exact: true }).fill(mergeNote)
  await form.getByRole('button', { name: 'Xác nhận gộp bàn', exact: true }).click()
  await expect(page.getByText(/Gộp bàn.*thành công/i)).toBeVisible()

  const mergeHistory = await waitForOperationHistory(request, headers, mergeNote)
  expect(mergeHistory).toMatchObject({
    operationType: 'Merge',
    sourceTableName: tableC,
    targetTableName: tableB,
    note: mergeNote,
  })

  const sourceOrderAfter = await request.get(`${apiURL}/api/Orders/${sourceOrder.id}`, { headers })
  expect(sourceOrderAfter.ok()).toBeTruthy()
  const sourceOrderBody = await sourceOrderAfter.json() as { restaurantTableName: string; items: Array<{ quantity: number; status: string }> }
  expect(sourceOrderBody.restaurantTableName).toBe(tableD)
  expect(sourceOrderBody.items.find(item => item.status !== 'Cancelled')?.quantity).toBe(2)
})
