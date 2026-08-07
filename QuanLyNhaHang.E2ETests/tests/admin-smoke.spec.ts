import { expect, test } from './fixtures'
import {
  expectNoHorizontalOverflow,
  loginAsAdmin,
  openAdminModule,
} from './helpers'

const adminModules = [
  'Tổng quan',
  'Nhân viên',
  'Khách hàng',
  'Ca làm việc & phân ca',
  'Tài khoản & phân quyền',
  'Khu vực & bàn',
  'Đặt bàn',
  'QR bàn',
  'Thực đơn',
  'Đơn hàng',
  'Bếp',
  'Thanh toán',
  'Hóa đơn',
  'Báo cáo doanh thu',
  'Khuyến mãi',
  'Nhật ký hoạt động',
  'Bảo mật tài khoản',
  'Cấu hình nhà hàng',
] as const

test('Admin mở toàn bộ module không phát sinh lỗi giao diện, JavaScript hoặc API', async ({ page }) => {
  await loginAsAdmin(page)

  await expect(
    page.locator('.sidebar nav button').filter({ hasText: 'Chuyển / gộp / tách bàn' }),
  ).toHaveCount(0)
  await expect(
    page.locator('.sidebar nav button').filter({ hasText: 'Chuyển bàn' }),
  ).toHaveCount(0)
  await expect(
    page.locator('.sidebar nav button').filter({ hasText: 'Kho nguyên liệu' }),
  ).toHaveCount(0)

  for (const moduleName of adminModules) {
    await test.step(moduleName, async () => {
      if (moduleName !== 'Tổng quan') {
        await openAdminModule(page, moduleName)
      } else {
        await expect(
          page.locator('.topbar').getByRole('heading', {
            name: moduleName,
            exact: true,
          }),
        ).toBeVisible()
      }

      await expect(page.locator('.module-loading')).toHaveCount(0)
      await expectNoHorizontalOverflow(page)
    })
  }
})
