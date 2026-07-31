import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const apiURL = process.env.E2E_API_URL ?? 'http://localhost:8080'
const frontendDirectory = fileURLToPath(
  new URL('../QuanLyNhaHang.Frontend/', import.meta.url),
)

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 120_000,
  expect: {
    timeout: 12_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.E2E_SKIP_WEBSERVER === 'true'
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        cwd: frontendDirectory,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          VITE_API_BASE_URL: apiURL,
        },
      },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})
