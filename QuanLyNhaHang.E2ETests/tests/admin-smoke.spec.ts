import { expect, test } from './fixtures'
import {
  expectNoHorizontalOverflow,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

test('Admin đăng nhập và mở các module trọng yếu không phát sinh lỗi', async ({ page }) => {
  await loginAsAdmin(page)

  await expect(
    page.locator('.topbar').getByRole('heading', { name: 'Tổng quan' }),
  ).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await openAdminModule(page, 'Tài khoản & phân quyền')
  await expect(
    page.getByRole('heading', { name: 'Tài khoản & phân quyền', exact: true }),
  ).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await openAdminModule(page, 'Khu vực & bàn')
  await expect(page.getByRole('heading', { name: 'Không gian phục vụ' })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await openAdminModule(page, 'Thực đơn')
  await expect(page.getByRole('heading', { name: 'Quản lý thực đơn' })).toBeVisible()
  await expectNoHorizontalOverflow(page)
})
