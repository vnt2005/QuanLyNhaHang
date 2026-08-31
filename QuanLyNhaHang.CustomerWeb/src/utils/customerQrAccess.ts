const QR_TABLE_ACCESS_KEY = 'customerQrTableAccess'
const LEGACY_LAST_QR_TOKEN_KEY = 'customerLastQrToken'

type QrTableAccess = Record<string, string>

function readAccess(): QrTableAccess {
  localStorage.removeItem(QR_TABLE_ACCESS_KEY)
  try {
    const raw = sessionStorage.getItem(QR_TABLE_ACCESS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => (
        Boolean(entry[0]) && typeof entry[1] === 'string' && Boolean(entry[1])
      )),
    )
  } catch {
    sessionStorage.removeItem(QR_TABLE_ACCESS_KEY)
    return {}
  }
}

export function rememberCustomerQrAccess(tableId: string, token: string) {
  if (!tableId || !token) return
  const access = readAccess()
  access[tableId] = token
  sessionStorage.setItem(QR_TABLE_ACCESS_KEY, JSON.stringify(access))
  localStorage.removeItem(LEGACY_LAST_QR_TOKEN_KEY)
  sessionStorage.removeItem(LEGACY_LAST_QR_TOKEN_KEY)
}

export function getCustomerQrTokenForTable(tableId?: string | null) {
  if (!tableId) return null
  return readAccess()[tableId] ?? null
}

export function clearCustomerQrAccess() {
  sessionStorage.removeItem(QR_TABLE_ACCESS_KEY)
  localStorage.removeItem(QR_TABLE_ACCESS_KEY)
  sessionStorage.removeItem(LEGACY_LAST_QR_TOKEN_KEY)
  localStorage.removeItem(LEGACY_LAST_QR_TOKEN_KEY)
}
