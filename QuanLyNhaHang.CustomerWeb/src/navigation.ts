const LEGACY_PATH_ALIASES: Record<string, string> = {
  'Đặt bàn': '/reservation',
  'Đơn hàng': '/orders',
  'Đơn của tôi': '/orders',
}

function normalizePath(path: string) {
  const normalized = path.trim()
  return LEGACY_PATH_ALIASES[normalized] ?? normalized
}

export function navigate(path: string) {
  const destination = normalizePath(path)
  if (window.location.pathname === destination) return
  window.history.pushState({}, '', destination)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

export function getQrToken(pathname: string) {
  const match = pathname.match(/^\/qr-order\/([^/]+)\/?$/i)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}
