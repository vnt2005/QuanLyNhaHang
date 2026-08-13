import { lazy, Suspense, useEffect, useState } from 'react'
import {
  clearCustomerSession,
  hasCustomerSession,
  restoreCustomerSession,
  type CustomerSession,
} from './api/customerAuth'
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
const ReservationPage = lazy(() => import('./pages/ReservationPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const QrOrderPage = lazy(() => import('./pages/QrOrderPage'))

const emptyData: CustomerSiteBootstrap = {
  restaurant: null,
  menuCategories: [],
  menuItems: [],
  reservationTables: [],
}

function PageLoading() {
  return (
    <main className="page-section">
      <StatusPanel kind="loading" title="Đang mở trang…" message="Nội dung đang được chuẩn bị cho bạn." />
    </main>
  )
}

export default function App() {
  const [pathname, setPathname] = useState(window.location.pathname)
  const [data, setData] = useState<CustomerSiteBootstrap>(emptyData)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const [session, setSession] = useState<CustomerSession | null>(null)
  const [sessionMessage, setSessionMessage] = useState('')

  useEffect(() => {
    const update = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  async function loadData() {
    setLoadingData(true)
    setDataError('')
    try {
      setData(await getCustomerSiteBootstrap())
    } catch (exception) {
      setDataError(exception instanceof Error ? exception.message : 'Không tải được thông tin nhà hàng.')
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  useEffect(() => {
    if (!hasCustomerSession()) return
    void restoreCustomerSession()
      .then(setSession)
      .catch(() => {
        clearCustomerSession()
        setSessionMessage('Phiên đăng nhập trước đã hết hạn. Vui lòng đăng nhập lại.')
      })
  }, [])

  useEffect(() => {
    const restaurantName = data.restaurant?.restaurantName || 'Nhà Hàng'
    const pageName = getQrToken(pathname)
      ? 'Gọi món tại bàn'
      : pathname === '/menu'
        ? 'Thực đơn'
        : pathname === '/reservation'
          ? 'Đặt bàn'
          : pathname === '/orders' || pathname === '/account'
            ? 'Tài khoản của tôi'
            : pathname === '/login'
              ? 'Đăng nhập'
              : pathname === '/'
                ? 'Trang chủ'
                : 'Không tìm thấy trang'
    document.title = `${pageName} | ${restaurantName}`
  }, [data.restaurant?.restaurantName, pathname])

  function handleSessionChanged(nextSession: CustomerSession | null) {
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
  }

  const qrToken = getQrToken(pathname)
  const isPublicDataRoute = pathname === '/' || pathname === '/menu' || pathname === '/reservation'

  function content() {
    if (qrToken) return <QrOrderPage token={qrToken} session={session} />
    if (loadingData && isPublicDataRoute) return <PageLoading />
    if (dataError && isPublicDataRoute) {
      return <main className="page-section"><StatusPanel kind="error" title="Chưa kết nối được với nhà hàng" message={dataError} onRetry={() => void loadData()} /></main>
    }
    if (pathname === '/') return <HomePage data={data} />
    if (pathname === '/menu') return <MenuPage data={data} />
    if (pathname === '/reservation') return <ReservationPage data={data} />
    if (pathname === '/orders' || pathname === '/account' || pathname === '/login') {
      return <AccountPage session={session} initialMessage={sessionMessage} onSessionChanged={handleSessionChanged} />
    }
    return (
      <main className="not-found page-section">
        <h1>Không tìm thấy trang</h1>
        <p>Đường dẫn này không tồn tại hoặc đã được thay đổi.</p>
        <button className="primary-button" type="button" onClick={() => navigate('/')}>Về trang chủ</button>
      </main>
    )
  }

  return (
    <div className="customer-site">
      <SiteHeader restaurant={data.restaurant} session={session} pathname={pathname} />
      <Suspense fallback={<PageLoading />}>{content()}</Suspense>
      <SiteFooter restaurant={data.restaurant} />
    </div>
  )
}
