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
  clearCustomerSession,
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
      clearCustomerSession()
      setSession(null)
      setSessionMessage('Phiên đăng nhập trước đã hết hạn. Vui lòng đăng nhập lại.')
      return null
    }
  }, [])

  useEffect(() => {
    if (hasCustomerSession()) void refreshCustomerSession()
  }, [refreshCustomerSession])

  useEffect(() => {
    if (!session?.token) return

    const delay = accessTokenRefreshDelay(session.token)
    if (delay == null) return

    const timer = window.setTimeout(
      () => void refreshCustomerSession(),
      Math.min(delay, 2_147_483_647),
    )
    return () => window.clearTimeout(timer)
  }, [refreshCustomerSession, session?.token])

  const handleSessionChanged = useCallback((nextSession: CustomerSession | null) => {
    setSession(nextSession)
    if (!nextSession) return

    setSessionMessage('')
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
