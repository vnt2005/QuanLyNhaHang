import { expect, test } from '@playwright/test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

function source(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
    'utf8',
  )
}

function collectFiles(directory: string, extension: string): string[] {
  const result: string[] = []
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry)
    if (statSync(fullPath).isDirectory()) {
      result.push(...collectFiles(fullPath, extension))
    } else if (fullPath.endsWith(extension)) {
      result.push(fullPath)
    }
  }
  return result
}

test('storage audit: dữ liệu phiên và trạng thái tạm không được ghi/đọc từ localStorage', () => {
  const sessionScopedSources = [
    'QuanLyNhaHang.Frontend/src/services/auth.ts',
    'QuanLyNhaHang.Frontend/src/services/customerAuth.ts',
    'QuanLyNhaHang.Frontend/src/utils/qrOrderStorage.ts',
    'QuanLyNhaHang.CustomerWeb/src/services/customerAuth.ts',
    'QuanLyNhaHang.CustomerWeb/src/utils/takeawayCart.ts',
    'QuanLyNhaHang.CustomerWeb/src/pages/QrOrderPage.tsx',
    'QuanLyNhaHang.CustomerWeb/src/context/CustomerSessionContext.tsx',
    'QuanLyNhaHang.CustomerWeb/src/components/PayOnlineButton.tsx',
    'QuanLyNhaHang.CustomerWeb/src/pages/PaymentResultPage.tsx',
    'QuanLyNhaHang.CustomerWeb/src/pages/OrdersPage.tsx',
    'QuanLyNhaHang.CustomerWeb/src/pages/TakeawayPage.tsx',
  ]

  for (const file of sessionScopedSources) {
    const content = source(file)
    expect(content, `${file} phải dùng sessionStorage cho trạng thái theo tab`)
      .toContain('sessionStorage')
    expect(content, `${file} không được đọc/ghi trạng thái phiên bằng localStorage`)
      .not.toMatch(/localStorage\.(?:getItem|setItem)\s*\(/)
  }
})

test('storage audit: chỉ các khóa cần tồn tại lâu dài mới được giữ localStorage', () => {
  const persistentSources = [
    {
      file: 'QuanLyNhaHang.CustomerWeb/src/services/client.ts',
      key: 'vnt-customer-client-id',
    },
    {
      file: 'QuanLyNhaHang.Frontend/src/services/requestProtection.ts',
      key: 'vnt-admin-client-id',
    },
    {
      file: 'QuanLyNhaHang.Frontend/src/pages/TableQrCodesPage.tsx',
      key: 'tableQrCodeClientBaseUrl',
    },
  ]

  for (const { file, key } of persistentSources) {
    const content = source(file)
    expect(content).toContain(key)
    expect(content).toMatch(/localStorage\.(?:getItem|setItem)\s*\(/)
  }
})

test('storage audit: backend không chứa browser storage API', () => {
  const backendDirectories = [
    'QuanLyNhaHang.Api',
    'QuanLyNhaHang.Application',
    'QuanLyNhaHang.Domain',
    'QuanLyNhaHang.Infrastructure',
  ].map(directory => fileURLToPath(new URL(`../../${directory}/`, import.meta.url)))

  for (const directory of backendDirectories) {
    for (const file of collectFiles(directory, '.cs')) {
      const content = readFileSync(file, 'utf8')
      expect(content, `${file} không được phụ thuộc browser localStorage/sessionStorage`)
        .not.toMatch(/\b(?:localStorage|sessionStorage)\b/)
    }
  }
})
