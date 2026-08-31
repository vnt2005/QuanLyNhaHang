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
  const target = new URL(destination, window.location.origin)

  if (target.origin !== window.location.origin) {
    window.location.assign(target.href)
    return
  }

  const currentRoute = `${window.location.pathname}${window.location.search}${window.location.hash}`
  const nextRoute = `${target.pathname}${target.search}${target.hash}`
  if (currentRoute === nextRoute) return

  window.history.pushState({}, '', nextRoute)
  window.dispatchEvent(new PopStateEvent('popstate'))
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
