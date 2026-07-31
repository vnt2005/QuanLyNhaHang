import {
  expect,
  test as base,
  type ConsoleMessage,
  type Request,
  type Response,
} from '@playwright/test'

const apiURL = (process.env.E2E_API_URL ?? 'http://127.0.0.1:8080')
  .replace(/\/$/, '')

const loginWindowSpacingMs = 7_000

type DiagnosticFixtures = {
  diagnostics: void
}

function consoleProblem(message: ConsoleMessage) {
  return `[console:${message.type()}] ${message.text()}`
}

function requestProblem(request: Request) {
  const failure = request.failure()?.errorText ?? 'unknown request failure'
  return `[request-failed] ${request.method()} ${request.url()} — ${failure}`
}

function responseProblem(response: Response) {
  return `[api:${response.status()}] ${response.request().method()} ${response.url()}`
}

function isIntentionalCancellation(request: Request) {
  const errorText = request.failure()?.errorText ?? ''
  return errorText.includes('ERR_ABORTED') || errorText.includes('NS_BINDING_ABORTED')
}

export const test = base.extend<DiagnosticFixtures>({
  diagnostics: [async ({ page }, use, testInfo) => {
    const problems: string[] = []

    page.on('pageerror', error => {
      problems.push(`[pageerror] ${error.stack ?? error.message}`)
    })

    page.on('console', message => {
      if (message.type() === 'error') {
        problems.push(consoleProblem(message))
      }
    })

    page.on('requestfailed', request => {
      if (
        request.url().startsWith(apiURL)
        && !isIntentionalCancellation(request)
      ) {
        problems.push(requestProblem(request))
      }
    })

    page.on('response', response => {
      if (
        response.url().startsWith(apiURL)
        && response.status() >= 400
      ) {
        problems.push(responseProblem(response))
      }
    })

    await use()

    // The API permits 10 login attempts per minute. Every E2E test logs in
    // independently, so keep a deterministic gap between test starts without
    // weakening the application's production rate limiter.
    await page.waitForTimeout(loginWindowSpacingMs)

    if (problems.length > 0) {
      await testInfo.attach('browser-diagnostics.txt', {
        body: Buffer.from(problems.join('\n'), 'utf8'),
        contentType: 'text/plain',
      })
    }

    expect(
      problems,
      'Trang phát sinh lỗi JavaScript, request thất bại hoặc API trả HTTP 4xx/5xx.',
    ).toEqual([])
  }, { auto: true }],
})

export { expect }
