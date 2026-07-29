import { useCallback, useEffect, useState } from 'react'
import {
  clearStoredAuth,
  getStoredRefreshToken,
  logoutSession,
  refreshSession,
  storeAuthResult,
  type LoginResult,
} from './api/auth'
import AccessManagementPage from './pages/AccessManagementPage'
import AccountSecurityPage from './pages/AccountSecurityPage'
import ActivityLogsPage from './pages/ActivityLogsPage'
import AreasTablesPage from './pages/AreasTablesPage'
import AuthPage from './pages/AuthPage'
import CustomerManagementPage from './pages/CustomerManagementPage'
import DashboardPage from './pages/DashboardPage'
import EmployeePage from './pages/EmployeePage'
import InvoicesPage from './pages/InvoicesPage'
import InventoryPage from './pages/InventoryPage'
import KitchenPage from './pages/KitchenPage'
import MenuManagementPage from './pages/MenuManagementPage'
import OrdersPage from './pages/OrdersPage'
import PaymentsPage from './pages/PaymentsPage'
import PromotionsPage from './pages/PromotionsPage'
import ReservationsPage from './pages/ReservationsPage'
import RestaurantSettingsPage from './pages/RestaurantSettingsPage'
import RevenueReportsPage from './pages/RevenueReportsPage'
import ShiftsSchedulingPage from './pages/ShiftsSchedulingPage'
import TableQrCodesPage from './pages/TableQrCodesPage'

const navigation = [
  ['Tổng quan', '⌂'], ['Nhân viên', '◉'], ['Khách hàng', '♙'],
  ['Ca làm việc & phân ca', '◷'], ['Tài khoản & phân quyền', '◆'],
  ['Khu vực & bàn', '▦'], ['Đặt bàn', '◫'], ['QR bàn', '▥'],
  ['Thực đơn', '☷'], ['Đơn hàng', '▣'], ['Bếp', '♨'],
  ['Thanh toán', '₫'], ['Hóa đơn', '▤'], ['Báo cáo doanh thu', '↗'],
  ['Khuyến mãi', '◇'], ['Kho nguyên liệu', '▧'],
  ['Nhật ký hoạt động', '◴'], ['Bảo mật tài khoản', '◈'],
  ['Cấu hình nhà hàng', '⚙'],
]

const ADMIN_ROLES = new Set([
  'Admin',
  'Manager',
  'Cashier',
  'Kitchen',
  'Staff',
])

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

export default function App() {
  const [result, setResult] = useState<LoginResult | null>(null)
  const [activeItem, setActiveItem] = useState('Tổng quan')
  const [restoringSession, setRestoringSession] = useState(true)
  const [authMessage, setAuthMessage] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const clearSession = useCallback((message = '') => {
    clearStoredAuth()
    setResult(null)
    setActiveItem('Tổng quan')
    setAuthMessage(message)
  }, [])

  const acceptAuthentication = useCallback(async (
    nextResult: LoginResult,
  ): Promise<string | void> => {
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
  }, [])

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
          clearSession(
            'Phiên đăng nhập trước đã hết hạn. Vui lòng đăng nhập lại.',
          )
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
  }, [
    acceptAuthentication,
    clearSession,
    result?.refreshToken,
    result?.token,
  ])

  async function handleLogout() {
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
  }

  if (restoringSession) {
    return (
      <main className="auth-restoring">
        <div>
          <span className="auth-restoring-spinner"/>
          <strong>Đang khôi phục phiên đăng nhập…</strong>
          <small>Hệ thống đang xác minh phiên bảo mật của bạn.</small>
        </div>
      </main>
    )
  }

  if (!result) {
    return (
      <AuthPage
        initialMessage={authMessage}
        onAuthenticated={acceptAuthentication}
      />
    )
  }

  const authenticatedResult = result
  const displayName = [
    authenticatedResult.ho,
    authenticatedResult.ten,
  ].filter(Boolean).join(' ')
    || authenticatedResult.email
    || 'Quản trị viên'

  function renderContent() {
    switch (activeItem) {
      case 'Nhân viên':
        return <EmployeePage/>
      case 'Khách hàng':
        return <CustomerManagementPage/>
      case 'Ca làm việc & phân ca':
        return <ShiftsSchedulingPage/>
      case 'Tài khoản & phân quyền':
        return <AccessManagementPage/>
      case 'Khu vực & bàn':
        return <AreasTablesPage/>
      case 'Đặt bàn':
        return <ReservationsPage/>
      case 'QR bàn':
        return <TableQrCodesPage/>
      case 'Thực đơn':
        return <MenuManagementPage/>
      case 'Đơn hàng':
        return <OrdersPage/>
      case 'Bếp':
        return <KitchenPage/>
      case 'Thanh toán':
        return <PaymentsPage/>
      case 'Hóa đơn':
        return <InvoicesPage/>
      case 'Báo cáo doanh thu':
        return <RevenueReportsPage/>
      case 'Khuyến mãi':
        return <PromotionsPage/>
      case 'Kho nguyên liệu':
        return <InventoryPage/>
      case 'Nhật ký hoạt động':
        return <ActivityLogsPage role={authenticatedResult.role}/>
      case 'Bảo mật tài khoản':
        return (
          <AccountSecurityPage
            auth={authenticatedResult}
            onRequireLogin={clearSession}
          />
        )
      case 'Cấu hình nhà hàng':
        return <RestaurantSettingsPage/>
      default:
        return (
          <DashboardPage
            name={authenticatedResult.ten ?? 'Admin'}
            onNavigate={setActiveItem}
          />
        )
    }
  }

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="logo">
          <span>QL</span>
          <div>
            <strong>Nhà Hàng</strong>
            <small>Admin Console</small>
          </div>
        </div>
        <nav>
          {navigation.map(([label, icon]) => (
            <button
              key={label}
              className={activeItem === label ? 'active' : ''}
              onClick={() => setActiveItem(label)}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot"/>
            <div>
              <strong>Hệ thống ổn định</strong>
              <small>API đang kết nối</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</span>
            <h1>{activeItem}</h1>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className={`profile profile-button${
                activeItem === 'Bảo mật tài khoản' ? ' active' : ''
              }`}
              onClick={() => setActiveItem('Bảo mật tài khoản')}
              aria-label="Mở bảo mật tài khoản"
            >
              <span>
                {displayName.charAt(0).toLocaleUpperCase('vi')}
              </span>
              <div>
                <strong>{displayName}</strong>
                <small>{authenticatedResult.role ?? 'Admin'}</small>
              </div>
            </button>
            <button
              className="logout"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  )
}
