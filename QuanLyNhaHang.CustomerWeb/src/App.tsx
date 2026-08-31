import { lazy, Suspense, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  CustomerSessionProvider,
  useCustomerSession,
} from './context/CustomerSessionContext'
import { useCustomerPath } from './hooks/useCustomerPath'
import {
  getCustomerSiteBootstrap,
  type CustomerSiteBootstrap,
} from './services/customerSite'
import { CustomerConfirmDialogHost } from './components/CustomerConfirmDialog'
import MotionEffects from './components/MotionEffects'
import SiteFooter from './components/SiteFooter'
import SiteHeader from './components/SiteHeader'
import StatusPanel from './components/StatusPanel'
import { getQrToken, navigate } from './utils/navigation'

const HomePage = lazy(() => import('./pages/HomePage'))
const MenuPage = lazy(() => import('./pages/MenuPage'))
const MenuItemDetailPage = lazy(() => import('./pages/MenuItemDetailPage'))
const TakeawayPage = lazy(() => import('./pages/TakeawayPage'))
const ReservationPage = lazy(() => import('./pages/ReservationPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
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
  return (
    <main className="sera-page">
      <StatusPanel kind="loading" title="Đang mở trang…" message="Nội dung đang được chuẩn bị cho bạn." />
    </main>
  )
}

function CustomerApplication({ pathname, routeKey }: { pathname: string; routeKey: string }) {
  const {
    handleSessionChanged,
    refreshCustomerSession,
    session,
    sessionMessage,
  } = useCustomerSession()
  const [data, setData] = useState<CustomerSiteBootstrap>(emptyData)
  const [loadingData, setLoadingData] = useState(true)
  const [dataError, setDataError] = useState('')
  const menuItemId = getMenuItemId(pathname)

  async function loadData() {
    setLoadingData(true)
    setDataError('')
    try { setData(await getCustomerSiteBootstrap()) }
    catch (exception) { setDataError(exception instanceof Error ? exception.message : 'Không tải được thông tin nhà hàng.') }
    finally { setLoadingData(false) }
  }

  useEffect(() => { void loadData() }, [])

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
                : pathname === '/orders'
                  ? 'Đơn của tôi'
                  : pathname === '/account'
                    ? 'Tài khoản của tôi'
                    : pathname === '/login'
                      ? 'Đăng nhập'
                      : pathname === '/'
                        ? 'Trang chủ'
                        : 'Không tìm thấy trang'
    document.title = `${pageName} | ${restaurantName}`
  }, [data.menuItems, data.restaurant?.restaurantName, menuItemId, pathname])

  const qrToken = getQrToken(pathname)
  const isPublicDataRoute = pathname === '/' || pathname === '/menu' || pathname === '/takeaway' || pathname === '/reservation' || Boolean(menuItemId)

  function content() {
    if (pathname === '/payment-result') return <PaymentResultPage session={session} />
    if (qrToken) return <QrOrderPage token={qrToken} session={session} />
    if (loadingData && isPublicDataRoute) return <PageLoading />
    if (dataError && isPublicDataRoute) {
      return (
        <main className="sera-page">
          <StatusPanel kind="error" title="Chưa kết nối được với nhà hàng" message={dataError} onRetry={() => void loadData()} />
        </main>
      )
    }
    if (pathname === '/') return <HomePage data={data} />
    if (pathname === '/menu') return <MenuPage data={data} />
    if (menuItemId) return <MenuItemDetailPage data={data} itemId={menuItemId} />
    if (pathname === '/takeaway') return <TakeawayPage data={data} session={session} />
    if (pathname === '/reservation') return <ReservationPage data={data} session={session} />
    if (pathname === '/orders') return <OrdersPage session={session} initialMessage={sessionMessage} onSessionChanged={handleSessionChanged} />
    if (pathname === '/account' || pathname === '/login') return <AccountPage session={session} initialMessage={sessionMessage} onSessionChanged={handleSessionChanged} />

    return (
      <main className="sera-page">
        <section className="sera-empty">
          <div>
            <h1 className="font-heading text-5xl font-medium">Không tìm thấy trang.</h1>
            <p>Đường dẫn này không tồn tại hoặc đã được thay đổi.</p>
            <Button type="button" onClick={() => navigate('/')}>Về trang chủ</Button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="customer-site">
      <SiteHeader
        restaurant={data.restaurant}
        session={session}
        pathname={pathname}
        onSessionRefresh={refreshCustomerSession}
      />
      <MotionEffects />
      <div className="sera-route-frame" key={routeKey}>
        <Suspense fallback={<PageLoading />}>{content()}</Suspense>
      </div>
      <SiteFooter restaurant={data.restaurant} />
    </div>
  )
}

export default function App() {
  const { pathname, routeKey } = useCustomerPath()

  return (
    <CustomerSessionProvider pathname={pathname}>
      <CustomerApplication pathname={pathname} routeKey={routeKey} />
      <CustomerConfirmDialogHost />
    </CustomerSessionProvider>
  )
}
