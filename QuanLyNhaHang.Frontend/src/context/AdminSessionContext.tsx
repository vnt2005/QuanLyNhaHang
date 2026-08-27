import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  clearStoredAuth,
  getStoredRefreshToken,
  logoutSession,
  refreshSession,
  storeAuthResult,
  type LoginResult,
} from '../services/auth'

const ADMIN_ROLES = new Set(['Admin', 'Manager', 'Cashier', 'Kitchen', 'Staff'])

type AdminSessionContextValue = {
  acceptAuthentication: (result: LoginResult) => Promise<string | void>
  authMessage: string
  clearSession: (message?: string) => void
  loggingOut: boolean
  logout: () => Promise<void>
  restoringSession: boolean
  result: LoginResult | null
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null)

function getRefreshDelay(token: string) {
  const fallbackDelay = 10 * 60 * 1000
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart) return fallbackDelay
    const normalized = payloadPart
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payloadPart.length / 4) * 4, '=')
    const payload = JSON.parse(window.atob(normalized)) as { exp?: number }
    if (typeof payload.exp !== 'number') return fallbackDelay
    return Math.max(payload.exp * 1000 - Date.now() - 60_000, 1_000)
  } catch {
    return fallbackDelay
  }
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<LoginResult | null>(null)
  const [restoringSession, setRestoringSession] = useState(true)
  const [authMessage, setAuthMessage] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const clearSession = useCallback((message = '') => {
    clearStoredAuth()
    setResult(null)
    setAuthMessage(message)
  }, [])

  const acceptAuthentication = useCallback(
    async (nextResult: LoginResult): Promise<string | void> => {
      if (!nextResult.token || !nextResult.refreshToken) {
        clearStoredAuth()
        return 'Backend không trả về phiên đăng nhập hợp lệ.'
      }
      if (!nextResult.role || !ADMIN_ROLES.has(nextResult.role)) {
        try {
          await logoutSession(nextResult.refreshToken)
        } catch {
          // The local session is still cleared when the server is unavailable.
        }
        clearStoredAuth()
        return 'Tài khoản khách hàng không thể truy cập cổng quản trị.'
      }

      storeAuthResult(nextResult)
      setResult(nextResult)
      setAuthMessage('')
    },
    [],
  )

  useEffect(() => {
    let disposed = false
    const refreshToken = getStoredRefreshToken()
    if (!refreshToken) {
      setRestoringSession(false)
      return () => {
        disposed = true
      }
    }

    async function restoreSession() {
      try {
        const restored = await refreshSession(refreshToken)
        if (disposed) return
        const rejection = await acceptAuthentication(restored)
        if (rejection && !disposed) setAuthMessage(rejection)
      } catch {
        if (!disposed) {
          clearSession('Phiên đăng nhập trước đã hết hạn. Vui lòng đăng nhập lại.')
        }
      } finally {
        if (!disposed) setRestoringSession(false)
      }
    }

    void restoreSession()
    return () => {
      disposed = true
    }
  }, [acceptAuthentication, clearSession])

  useEffect(() => {
    if (!result?.token || !result.refreshToken) return
    let disposed = false
    const refreshToken = result.refreshToken
    const timer = window.setTimeout(async () => {
      try {
        const refreshed = await refreshSession(refreshToken)
        if (disposed) return
        const rejection = await acceptAuthentication(refreshed)
        if (rejection) clearSession(rejection)
      } catch {
        if (!disposed) {
          clearSession('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
        }
      }
    }, getRefreshDelay(result.token))

    return () => {
      disposed = true
      window.clearTimeout(timer)
    }
  }, [acceptAuthentication, clearSession, result?.refreshToken, result?.token])

  const logout = useCallback(async () => {
    const refreshToken = result?.refreshToken ?? getStoredRefreshToken()
    setLoggingOut(true)
    try {
      await logoutSession(refreshToken)
    } catch {
      // Local credentials must still be removed if the backend is unavailable.
    } finally {
      clearSession('Bạn đã đăng xuất an toàn khỏi thiết bị này.')
      setLoggingOut(false)
    }
  }, [clearSession, result?.refreshToken])

  const value = useMemo(
    () => ({
      acceptAuthentication,
      authMessage,
      clearSession,
      loggingOut,
      logout,
      restoringSession,
      result,
    }),
    [
      acceptAuthentication,
      authMessage,
      clearSession,
      loggingOut,
      logout,
      restoringSession,
      result,
    ],
  )

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  )
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext)
  if (!context) {
    throw new Error('useAdminSession must be used inside AdminSessionProvider.')
  }
  return context
}
