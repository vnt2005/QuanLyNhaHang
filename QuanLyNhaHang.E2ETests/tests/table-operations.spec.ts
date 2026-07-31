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

test('Điều phối bàn: chuyển, tách rồi gộp order và lưu lịch sử', async ({ page, request }) => {
  const id = suffix()
  const areaName = `Khu điều phối E2E ${id}`
  const tableA = `Bàn nguồn E2E ${id}`
  const tableB = `Bàn gộp E2E ${id}`
  const tableC = `Bàn trống tách E2E ${id}`
  const tableD = `Bàn trống chuyển E2E ${id}`
  const menuItemName = `Món điều phối E2E ${id}`
  const transferNote = `Chuyển bàn Playwright ${id}`
  const splitNote = `Tách bàn Playwright ${id}`
  const mergeNote = `Gộp bàn Playwright ${id}`

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: { name: areaName, description: 'Khu điều phối Playwright.' },
  })
  expect(areaResponse.status()).toBe(200)
  const area = await areaResponse.json() as { id: string }

  const createTable = async (name: string) => {
    const response = await request.post(`${apiURL}/api/RestaurantTables`, {
      headers,
      data: { areaId: area.id, name, capacity: 6, note: 'Bàn điều phối E2E.' },
    })
    expect(response.status()).toBe(200)
    return await response.json() as { id: string }
  }

  const [sourceTable, mergeTable, splitTable, transferTable] = await Promise.all([
    createTable(tableA),
    createTable(tableB),
    createTable(tableC),
    createTable(tableD),
  ])

  const categoryResponse = await request.post(`${apiURL}/api/MenuCategories`, {
    headers,
    data: { name: `Danh mục điều phối ${id}`, description: null, displayOrder: 100 },
  })
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
  expect(menuResponse.status()).toBe(200)
  const menuItem = await menuResponse.json() as { id: string }

  const sourceOrderResponse = await request.post(`${apiURL}/api/Orders`, {
    headers,
    data: {
      restaurantTableId: sourceTable.id,
      note: `Order nguồn ${id}`,
      items: [{ menuItemId: menuItem.id, quantity: 4, note: '4 phần để tách.' }],
    },
  })
  expect(sourceOrderResponse.status()).toBe(200)

  const targetOrderResponse = await request.post(`${apiURL}/api/Orders`, {
    headers,
    data: {
      restaurantTableId: mergeTable.id,
      note: `Order đích ${id}`,
      items: [{ menuItemId: menuItem.id, quantity: 1, note: 'Order giữ lại.' }],
    },
  })
  expect(targetOrderResponse.status()).toBe(200)

  await openAdminModule(page, 'Chuyển / gộp / tách bàn')
  const form = page.locator('.operation-form-card')

  await page.getByRole('button', { name: 'Chuyển bàn', exact: true }).click()
  await selectOptionContaining(form.getByLabel('Order nguồn', { exact: true }), tableA)
  await selectOptionContaining(form.getByLabel('Bàn đích', { exact: true }), tableD)
  await form.getByLabel('Ghi chú thao tác', { exact: true }).fill(transferNote)
  await form.getByRole('button', { name: 'Xác nhận chuyển bàn', exact: true }).click()
  await expect(page.getByText(/Chuyển bàn.*thành công/i)).toBeVisible()

  let historyResponse = await request.get(
    `${apiURL}/api/table-operations/paginated?keyword=${encodeURIComponent(transferNote)}&pageNumber=1&pageSize=10`,
    { headers },
  )
  expect(historyResponse.status()).toBe(200)
  let history = await historyResponse.json() as { items: Array<{ operationType: string; sourceTableName: string; targetTableName: string; note: string }> }
  expect(history.items).toHaveLength(1)
  expect(history.items[0]).toMatchObject({
    operationType: 'Transfer',
    sourceTableName: tableA,
    targetTableName: tableD,
    note: transferNote,
  })

  await page.getByRole('button', { name: 'Tách bàn', exact: true }).click()
  await selectOptionContaining(form.getByLabel('Order nguồn', { exact: true }), tableD)
  await selectOptionContaining(form.getByLabel('Bàn đích', { exact: true }), tableC)
  const splitItem = form.locator('.split-item-row').filter({ hasText: menuItemName })
  await expect(splitItem).toBeVisible()
  await splitItem.getByLabel('Số lượng', { exact: true }).selectOption('2')
  await form.getByLabel('Ghi chú cho order mới', { exact: true }).fill(`Order tách ${id}`)
  await form.getByLabel('Ghi chú thao tác', { exact: true }).fill(splitNote)
  await form.getByRole('button', { name: 'Xác nhận tách bàn', exact: true }).click()
  await expect(page.getByText(/Tách bàn.*thành công/i)).toBeVisible()

  historyResponse = await request.get(
    `${apiURL}/api/table-operations/paginated?keyword=${encodeURIComponent(splitNote)}&pageNumber=1&pageSize=10`,
    { headers },
  )
  history = await historyResponse.json() as { items: Array<{ operationType: string; sourceTableName: string; targetTableName: string; note: string; details: Array<{ menuItemName: string; quantity: number }> }> }
  expect(history.items).toHaveLength(1)
  expect(history.items[0].operationType).toBe('Split')
  expect(history.items[0].sourceTableName).toBe(tableD)
  expect(history.items[0].targetTableName).toBe(tableC)
  expect(history.items[0].details).toEqual(
    expect.arrayContaining([expect.objectContaining({ menuItemName, quantity: 2 })]),
  )

  await page.getByRole('button', { name: 'Gộp bàn', exact: true }).click()
  await selectOptionContaining(form.getByLabel('Order nguồn', { exact: true }), tableC)
  await selectOptionContaining(
    form.getByLabel('Order đích giữ lại sau khi gộp', { exact: true }),
    tableB,
  )
  await form.getByLabel('Ghi chú thao tác', { exact: true }).fill(mergeNote)
  await form.getByRole('button', { name: 'Xác nhận gộp bàn', exact: true }).click()
  await expect(page.getByText(/Gộp bàn.*thành công/i)).toBeVisible()

  historyResponse = await request.get(
    `${apiURL}/api/table-operations/paginated?keyword=${encodeURIComponent(mergeNote)}&pageNumber=1&pageSize=10`,
    { headers },
  )
  history = await historyResponse.json() as { items: Array<{ operationType: string; sourceTableName: string; targetTableName: string; note: string }> }
  expect(history.items).toHaveLength(1)
  expect(history.items[0]).toMatchObject({
    operationType: 'Merge',
    sourceTableName: tableC,
    targetTableName: tableB,
    note: mergeNote,
  })

  const sourceOrder = await sourceOrderResponse.json() as { id: string }
  const sourceOrderAfter = await request.get(`${apiURL}/api/Orders/${sourceOrder.id}`, { headers })
  expect(sourceOrderAfter.status()).toBe(200)
  const sourceOrderBody = await sourceOrderAfter.json() as { restaurantTableName: string; items: Array<{ quantity: number; status: string }> }
  expect(sourceOrderBody.restaurantTableName).toBe(tableD)
  expect(sourceOrderBody.items.find(item => item.status !== 'Cancelled')?.quantity).toBe(2)

  void transferTable
})
