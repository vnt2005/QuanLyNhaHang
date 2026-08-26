import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useState } from 'react'
import {
  clearCustomerSession,
  CustomerSessionRefreshSupersededError,
  hasCustomerSession,
  restoreCustomerSession,
  type CustomerSession,
} from './api/customerAuth'
import { accessTokenRefreshDelay } from './api/accessToken'
import {
  getCustomerSiteBootstrap,
  type CustomerSiteBootstrap,
} from './api/customerSite'
import SiteFooter from './components/SiteFooter'
import SiteHeader from './components/SiteHeader'
import StatusPanel from './components/StatusPanel'
import { getQrToken, navigate } from './navigation'

const HomePage = lazy(() => import('./pages/HomePage'))
const MenuPage = lazy(() => import('./pages/MenuPage'))
const MenuItemDetailPage = lazy(() => import('./pages/MenuItemDetailPage'))
const TakeawayPage = lazy(() => import('./pages/TakeawayPage'))
const ReservationPage = lazy(() => import('./pages/ReservationPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const QrOrderPage = lazy(() => import('./pages/QrOrderPage'))
const PaymentResultPage = lazy(() => import('./pages/PaymentResultPage'))

const emptyData: CustomerSiteBootstrap = {
  restaurant: null,
  menuCategories: [],
  menuItems: [],
  reservationTables: [],
}

function getMenuItemId(pathname: string) {
  const match = pathname.match(/^\/menu\/([^/]+)\/?$/i)
  if (!match?.[1]) return null
  try { return decodeURIComponent(match[1]) } catch { return match[1] }
}

function PageLoading() {
  return <main className="page-section"><StatusPanel kind="loading" title="Đang mở trang…" message="Nội dung đang được chuẩn bị cho bạn." /></main>
}

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const [data, setData] = useState<CustomerSiteBootstrap>(emptyData)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [sessionMessage, setSessionMessage] = useState('')
  const menuItemId = getMenuItemId(pathname)

  useEffect(() => {
    const update = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  async function loadData() {
    setLoadingData(true)
    setDataError('')
    try { setData(await getCustomerSiteBootstrap()) }
    catch (exception) { setDataError(exception instanceof Error ? exception.message : 'Không tải được thông tin nhà hàng.') }
    finally { setLoadingData(false) }
  }

  useEffect(() => { void loadData() }, [])

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

  useEffect(() => {
    const restaurantName = data.restaurant?.restaurantName || 'Nhà Hàng'
    const menuItemName = menuItemId ? data.menuItems.find(item => item.id === menuItemId)?.name : null
    const pageName = getQrToken(pathname)
      ? 'Gọi món tại bàn'
      : menuItemId
        ? menuItemName || 'Chi tiết món'
        : pathname === '/menu'
          ? 'Thực đơn'
          : pathname === '/takeaway'
            ? 'Đặt món mang về'
            : pathname === '/reservation'
              ? 'Đặt bàn'
              : pathname === '/payment-result'
                ? 'Kết quả thanh toán'
                : pathname === '/orders' || pathname === '/account'
                  ? 'Tài khoản của tôi'
                  : pathname === '/login'
                    ? 'Đăng nhập'
                    : pathname === '/'
                      ? 'Trang chủ'
                      : 'Không tìm thấy trang'
    document.title = `${pageName} | ${restaurantName}`
  }, [data.menuItems, data.restaurant?.restaurantName, menuItemId, pathname])

  const handleSessionChanged = useCallback((nextSession: CustomerSession | null) => {
    setSession(nextSession)
    if (!nextSession) return
    setSessionMessage('')
    const returnPath = localStorage.getItem('customerReturnPath')
    if (returnPath) {
      localStorage.removeItem('customerReturnPath')
      navigate(returnPath)
    } else if (pathname === '/login') {
      navigate('/orders')
    }
  }, [pathname])

  const qrToken = getQrToken(pathname)
  const isPublicDataRoute = pathname === '/' || pathname === '/menu' || pathname === '/takeaway' || pathname === '/reservation' || Boolean(menuItemId)
  const premiumCustomerChrome = pathname === '/'
    || pathname === '/menu'
    || Boolean(menuItemId)
    || pathname === '/takeaway'
    || pathname === '/reservation'
    || pathname === '/payment-result'

  function content() {
    if (pathname === '/payment-result') return <PaymentResultPage session={session} />
    if (qrToken) return <QrOrderPage token={qrToken} session={session} />
    if (loadingData && isPublicDataRoute) return <PageLoading />
    if (dataError && isPublicDataRoute) return <main className="page-section"><StatusPanel kind="error" title="Chưa kết nối được với nhà hàng" message={dataError} onRetry={() => void loadData()} /></main>
    if (pathname === '/') return <HomePage data={data} />
    if (pathname === '/menu') return <MenuPage data={data} />
    if (menuItemId) return <MenuItemDetailPage data={data} itemId={menuItemId} />
    if (pathname === '/takeaway') return <TakeawayPage data={data} session={session} />
    if (pathname === '/reservation') return <ReservationPage data={data} session={session} />
    if (pathname === '/orders' || pathname === '/account' || pathname === '/login') return <AccountPage session={session} initialMessage={sessionMessage} onSessionChanged={handleSessionChanged} />
    return <main className="not-found page-section"><h1>Không tìm thấy trang</h1><p>Đường dẫn này không tồn tại hoặc đã được thay đổi.</p><button className="primary-button" type="button" onClick={() => navigate('/')}>Về trang chủ</button></main>
  }

  return (
    <div className="customer-site">
      <SiteHeader
        restaurant={data.restaurant}
        session={session}
        pathname={pathname}
        onSessionRefresh={refreshCustomerSession}
      />
      <Suspense fallback={<PageLoading />}>{content()}</Suspense>
      <SiteFooter restaurant={data.restaurant} home={premiumCustomerChrome} />
    </div>
  )
}
