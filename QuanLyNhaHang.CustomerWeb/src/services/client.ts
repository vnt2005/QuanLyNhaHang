const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
export const API_BASE_URL = configuredApiBaseUrl === undefined
  ? 'http://localhost:8080'
  : configuredApiBaseUrl.replace(/\/+$/, '')

const CLIENT_ID_STORAGE_KEY = 'vnt-customer-client-id'
const IDEMPOTENCY_REUSE_MS = 2_000
const recentIdempotencyKeys = new Map<
  string,
  { key: string; expiresAt: number }
>()
const inFlightGetRequests = new Map<string, Promise<unknown>>()

function createRequestId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function getClientId() {
  try {
    localStorage.removeItem(CLIENT_ID_STORAGE_KEY)
    const existing = sessionStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (existing) return existing
    const created = createRequestId()
    sessionStorage.setItem(CLIENT_ID_STORAGE_KEY, created)
    return created
  } catch {
    return createRequestId()
  }
}

function pruneExpiredIdempotencyKeys(now: number) {
  recentIdempotencyKeys.forEach((entry, fingerprint) => {
    if (entry.expiresAt <= now) recentIdempotencyKeys.delete(fingerprint)
  })
}

function getIdempotencyKey(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
) {
  if ((init?.method ?? 'GET').toUpperCase() !== 'POST') return null

  const now = Date.now()
  pruneExpiredIdempotencyKeys(now)

  const fingerprint = `${accessToken ?? ''}\n${path}\n${String(init?.body ?? '')}`
  const existing = recentIdempotencyKeys.get(fingerprint)
  if (existing && existing.expiresAt > now) return existing.key

  const key = createRequestId()
  recentIdempotencyKeys.set(fingerprint, {
    key,
    expiresAt: now + IDEMPOTENCY_REUSE_MS,
  })
  return key
}

function getRequestDedupeKey(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
) {
  if ((init?.method ?? 'GET').toUpperCase() !== 'GET' || init?.signal) {
    return null
  }

  const headers = Array.from(new Headers(init?.headers).entries())
    .sort(([left], [right]) => left.localeCompare(right))

  return JSON.stringify([
    path,
    accessToken ?? '',
    init?.credentials ?? '',
    init?.cache ?? '',
    headers,
  ])
}

type ApiProblem = {
  message?: string
  title?: string
  detail?: string
  errors?: Record<string, string[]>
  traceId?: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function withTraceId(message: string, traceId?: string) {
  return traceId ? `${message} (traceId: ${traceId})` : message
}

function errorMessage(body: unknown, status: number) {
  const problem = body && typeof body === 'object'
    ? body as ApiProblem
    : undefined

  if (problem?.message) return withTraceId(problem.message, problem.traceId)
  if (problem?.detail) return withTraceId(problem.detail, problem.traceId)
  if (problem?.errors) {
    return withTraceId(
      Object.values(problem.errors).flat().find(Boolean)
        ?? 'Dữ liệu chưa hợp lệ.',
      problem.traceId,
    )
  }
  if (problem?.title) return withTraceId(problem.title, problem.traceId)

  if (status === 401) return withTraceId(
    'Phiên đăng nhập đã hết hạn.',
    problem?.traceId,
  )
  if (status === 403) return withTraceId(
    'Bạn không có quyền thực hiện thao tác này.',
    problem?.traceId,
  )
  if (status === 429) return withTraceId(
    'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
    problem?.traceId,
  )
  return withTraceId(
    'Không thể kết nối tới hệ thống nhà hàng.',
    problem?.traceId,
  )
}

async function executeRequest<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
) {
  const idempotencyKey = getIdempotencyKey(path, init, accessToken)
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': getClientId(),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(errorMessage(body, response.status), response.status)
  }
  return body as T
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
) {
  const dedupeKey = getRequestDedupeKey(path, init, accessToken)
  if (!dedupeKey) return executeRequest<T>(path, init, accessToken)

  const existing = inFlightGetRequests.get(dedupeKey)
  if (existing) return existing as Promise<T>

  const request = executeRequest<T>(path, init, accessToken)
  inFlightGetRequests.set(dedupeKey, request)

  try {
    return await request
  } finally {
    if (inFlightGetRequests.get(dedupeKey) === request) {
      inFlightGetRequests.delete(dedupeKey)
    }
  }
}
