export function accessTokenRefreshDelay(accessToken: string) {
  try {
    const encodedPayload = accessToken.split('.')[1]
    if (!encodedPayload) return null

    const base64 = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=')
    const payload = JSON.parse(atob(base64)) as { exp?: number }
    if (!Number.isFinite(payload.exp)) return null

    return Math.max(0, Number(payload.exp) * 1_000 - Date.now() - 60_000)
  } catch {
    return null
  }
}
