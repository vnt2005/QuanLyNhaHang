import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { accessTokenRefreshDelay } from '../services/accessToken'
import {
  CustomerSessionRefreshSupersededError,
  hasCustomerSession,
  restoreCustomerSession,
  type CustomerSession,
} from '../services/customerAuth'
import { navigate } from '../utils/navigation'

type CustomerSessionContextValue = {
  handleSessionChanged: (session: CustomerSession | null) => void
  refreshCustomerSession: () => Promise<CustomerSession | null>
  session: CustomerSession | null
  sessionMessage: string
}

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null)
const SESSION_REFRESH_RETRY_MS = 30_000

export function CustomerSessionProvider({
  children,
  pathname,
}: {
  children: ReactNode
  pathname: string
}) {
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [sessionMessage, setSessionMessage] = useState('')

  const refreshCustomerSession = useCallback(async () => {
    try {
      const nextSession = await restoreCustomerSession()
      setSession(nextSession)
      setSessionMessage('')
      return nextSession
    } catch (exception) {
      if (exception instanceof CustomerSessionRefreshSupersededError) return null

      if (!hasCustomerSession()) {
        setSession(null)
        setSessionMessage('Phiên đăng nhập trước đã hết hạn. Vui lòng đăng nhập lại.')
      } else {
        setSessionMessage('Kết nối tạm gián đoạn. Hệ thống sẽ tự thử khôi phục phiên đăng nhập.')
      }
      return null
    }
  }, [])

  useEffect(() => {
    let disposed = false
    let retryTimer: number | undefined

    const clearRetry = () => {
      if (retryTimer === undefined) return
      window.clearTimeout(retryTimer)
      retryTimer = undefined
    }

    const restore = async () => {
      if (disposed || !hasCustomerSession()) return
      clearRetry()
      const nextSession = await refreshCustomerSession()
      if (!disposed && !nextSession && hasCustomerSession()) {
        retryTimer = window.setTimeout(() => void restore(), SESSION_REFRESH_RETRY_MS)
      }
    }

    if (hasCustomerSession()) void restore()

    const retryWhenOnline = () => {
      if (hasCustomerSession()) void restore()
    }
    window.addEventListener('online', retryWhenOnline)

    return () => {
      disposed = true
      clearRetry()
      window.removeEventListener('online', retryWhenOnline)
    }
  }, [refreshCustomerSession])

  useEffect(() => {
    if (!session?.token) return

    const refreshDelay = accessTokenRefreshDelay(session.token)
    if (refreshDelay == null) return

    let disposed = false
    let timer: number | undefined

    const refresh = async () => {
      if (disposed) return
      const nextSession = await refreshCustomerSession()
      if (!disposed && !nextSession && hasCustomerSession()) {
        timer = window.setTimeout(() => void refresh(), SESSION_REFRESH_RETRY_MS)
      }
    }

    timer = window.setTimeout(
      () => void refresh(),
      Math.min(refreshDelay, 2_147_483_647),
    )

    return () => {
      disposed = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [refreshCustomerSession, session?.token])

  const handleSessionChanged = useCallback((nextSession: CustomerSession | null) => {
    setSession(nextSession)
    setSessionMessage('')
    if (!nextSession) return

    localStorage.removeItem('customerReturnPath')
    const returnPath = sessionStorage.getItem('customerReturnPath')
    if (returnPath) {
      sessionStorage.removeItem('customerReturnPath')
      navigate(returnPath)
    } else if (pathname === '/login') {
      navigate('/orders')
    }
  }, [pathname])

  const value = useMemo(
    () => ({
      handleSessionChanged,
      refreshCustomerSession,
      session,
      sessionMessage,
    }),
    [handleSessionChanged, refreshCustomerSession, session, sessionMessage],
  )

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  )
}

export function useCustomerSession() {
  const context = useContext(CustomerSessionContext)
  if (!context) {
    throw new Error('useCustomerSession must be used inside CustomerSessionProvider.')
  }
  return context
}
