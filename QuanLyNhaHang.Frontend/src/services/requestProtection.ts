const CLIENT_ID_STORAGE_KEY = 'vnt-admin-client-id'
const IDEMPOTENCY_REUSE_MS = 2_000
const recentKeys = new Map<string, { key: string; expiresAt: number }>()

function createRequestId() {
  return globalThis.crypto?.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function getClientId() {
  try {
    const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (existing) return existing
    const created = createRequestId()
    localStorage.setItem(CLIENT_ID_STORAGE_KEY, created)
    return created
  } catch {
    return createRequestId()
  }
}

export function getRequestProtectionHeaders(
  path: string,
  init?: RequestInit,
) {
  const headers: Record<string, string> = {
    'X-Client-Id': getClientId(),
  }

  if ((init?.method ?? 'GET').toUpperCase() !== 'POST') return headers

  const fingerprint = `${path}\n${String(init?.body ?? '')}`
  const now = Date.now()
  const existing = recentKeys.get(fingerprint)
  const key = existing && existing.expiresAt > now
    ? existing.key
    : createRequestId()

  recentKeys.set(fingerprint, {
    key,
    expiresAt: now + IDEMPOTENCY_REUSE_MS,
  })
  headers['Idempotency-Key'] = key
  return headers
}
