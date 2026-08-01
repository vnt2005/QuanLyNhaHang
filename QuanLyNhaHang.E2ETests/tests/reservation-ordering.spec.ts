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

function futureIso(days: number) {
  const value = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  value.setHours(19, 0, 0, 0)
  return value.toISOString()
}

test('Đặt bàn: lịch vừa tạo luôn đứng đầu trang 1 bất kể ngày đặt', async ({ page, request }) => {
  const id = suffix()
  const areaName = `Khu sắp xếp đặt bàn E2E ${id}`
  const tableName = `Bàn sắp xếp E2E ${id}`
  const olderCustomer = `Khách tạo trước E2E ${id}`
  const newestCustomer = `Khách tạo sau E2E ${id}`

  const session = await loginAsAdmin(page)
  const headers = bearerHeaders(session)

  const areaResponse = await request.post(`${apiURL}/api/Areas`, {
    headers,
    data: {
      name: areaName,
      description: 'Kiểm tra thứ tự đặt bàn mới nhất.',
    },
  })
  expect(areaResponse.ok()).toBeTruthy()
  const area = await areaResponse.json() as { id: string }

  const tableResponse = await request.post(`${apiURL}/api/RestaurantTables`, {
    headers,
    data: {
      areaId: area.id,
      name: tableName,
      capacity: 6,
      note: 'Bàn kiểm tra thứ tự đặt bàn.',
    },
  })
  expect(tableResponse.ok()).toBeTruthy()
  const table = await tableResponse.json() as { id: string }

  const firstResponse = await request.post(`${apiURL}/api/reservations`, {
    headers,
    data: {
      restaurantTableId: table.id,
      customerName: olderCustomer,
      phoneNumber: `03${id.slice(-8).padStart(8, '0')}`,
      email: `reservation-order-first-${id}@example.com`,
      numberOfGuests: 2,
      reservationTime: futureIso(10),
      depositAmount: 100_000,
      note: 'Tạo trước nhưng ngày đặt xa hơn.',
    },
  })
  expect(firstResponse.ok()).toBeTruthy()

  await page.waitForTimeout(25)

  const secondResponse = await request.post(`${apiURL}/api/reservations`, {
    headers,
    data: {
      restaurantTableId: table.id,
      customerName: newestCustomer,
      phoneNumber: `07${id.slice(-8).padStart(8, '0')}`,
      email: `reservation-order-latest-${id}@example.com`,
      numberOfGuests: 3,
      reservationTime: futureIso(1),
      depositAmount: 200_000,
      note: 'Tạo sau và phải đứng đầu danh sách.',
    },
  })
  expect(secondResponse.ok()).toBeTruthy()

  const paginatedResponse = await request.get(
    `${apiURL}/api/reservations/paginated?pageNumber=1&pageSize=12`,
    { headers },
  )
  expect(paginatedResponse.ok()).toBeTruthy()
  const paginated = await paginatedResponse.json() as {
    pageNumber: number
    items: Array<{ customerName: string }>
  }
  expect(paginated.pageNumber).toBe(1)
  expect(paginated.items[0]?.customerName).toBe(newestCustomer)

  await openAdminModule(page, 'Đặt bàn')

  const firstRow = page.locator('.reservations-table tbody tr').first()
  await expect(firstRow).toContainText(newestCustomer)
  await expect(firstRow).not.toContainText(olderCustomer)
  await expect(page.locator('.reservations-pagination')).toContainText('Trang 1/')
})
