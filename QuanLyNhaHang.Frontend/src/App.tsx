import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import {
  clearStoredAuth,
  getStoredRefreshToken,
  logoutSession,
  refreshSession,
  storeAuthResult,
  type LoginResult,
} from './api/auth'
import AuthPage from './pages/AuthPage'
import { ConfirmDialogHost } from './design-system/confirmDialog'

const loadAccessManagementPage = () => import('./pages/AccessManagementPage')
const loadAccountSecurityPage = () => import('./pages/AccountSecurityPage')
const loadActivityLogsPage = () => import('./pages/ActivityLogsPage')
const loadAreasTablesPage = () => import('./pages/AreasTablesPage')
const loadCustomerManagementPage = () =>
  import('./pages/CustomerManagementPage')
const loadDashboardPage = () => import('./pages/DashboardPage')
const loadEmployeePage = () => import('./pages/EmployeePage')
const loadInvoicesPage = () => import('./pages/InvoicesPage')
const loadInventoryPage = () => import('./pages/InventoryPage')
const loadKitchenPage = () => import('./pages/KitchenPage')
const loadMenuManagementPage = () => import('./pages/MenuManagementPage')
const loadOrdersPage = () => import('./pages/OrdersPage')
const loadPaymentsPage = () => import('./pages/PaymentsPage')
const loadPromotionsPage = () => import('./pages/PromotionsPage')
const loadQrOrderPage = () => import('./pages/QrOrderPage')
const loadReservationsPage = () => import('./pages/ReservationsPage')
const loadRestaurantSettingsPage = () =>
  import('./pages/RestaurantSettingsPage')
const loadRevenueReportsPage = () => import('./pages/RevenueReportsPage')
const loadShiftsSchedulingPage = () => import('./pages/ShiftsSchedulingPage')
const loadTableQrCodesPage = () => import('./pages/TableQrCodesPage')

const AccessManagementPage = lazy(loadAccessManagementPage)
const AccountSecurityPage = lazy(loadAccountSecurityPage)
const ActivityLogsPage = lazy(loadActivityLogsPage)
const AreasTablesPage = lazy(loadAreasTablesPage)
const CustomerManagementPage = lazy(loadCustomerManagementPage)
const DashboardPage = lazy(loadDashboardPage)
const EmployeePage = lazy(loadEmployeePage)
const InvoicesPage = lazy(loadInvoicesPage)
const InventoryPage = lazy(loadInventoryPage)
const KitchenPage = lazy(loadKitchenPage)
const MenuManagementPage = lazy(loadMenuManagementPage)
const OrdersPage = lazy(loadOrdersPage)
const PaymentsPage = lazy(loadPaymentsPage)
const PromotionsPage = lazy(loadPromotionsPage)
const QrOrderPage = lazy(loadQrOrderPage)
const ReservationsPage = lazy(loadReservationsPage)
const RestaurantSettingsPage = lazy(loadRestaurantSettingsPage)
const RevenueReportsPage = lazy(loadRevenueReportsPage)
const ShiftsSchedulingPage = lazy(loadShiftsSchedulingPage)
const TableQrCodesPage = lazy(loadTableQrCodesPage)

type NavigationItem = {
  label: string
  section: string
  icon: string
  permissions?: string[]
  preload?: () => Promise<unknown>
}

const navigation: NavigationItem[] = [
  {
    label: 'Tổng quan',
    section: 'Tổng quan',
    icon: '⌂',
    permissions: ['Dashboard.View'],
    preload: loadDashboardPage,
  },
  {
    label: 'Nhân viên',
    section: 'Khách hàng & đội ngũ',
    icon: '◉',
    permissions: ['Employees.View'],
    preload: loadEmployeePage,
  },
  {
    label: 'Khách hàng',
    section: 'Khách hàng & đội ngũ',
    icon: '♙',
    permissions: ['Users.View'],
    preload: loadCustomerManagementPage,
  },
  {
    label: 'Ca làm việc & phân ca',
    section: 'Khách hàng & đội ngũ',
    icon: '◷',
    permissions: ['Shifts.View', 'EmployeeShifts.View'],
    preload: loadShiftsSchedulingPage,
  },
  {
    label: 'Tài khoản & phân quyền',
    section: 'Kiểm soát',
    icon: '◆',
    permissions: [
      'Users.View',
      'Roles.View',
      'Permissions.View',
      'RolePermissions.View',
    ],
    preload: loadAccessManagementPage,
  },
  {
    label: 'Khu vực & bàn',
    section: 'Vận hành',
    icon: '▦',
    permissions: ['Tables.View'],
    preload: loadAreasTablesPage,
  },
  {
    label: 'Đặt bàn',
    section: 'Vận hành',
    icon: '◫',
    permissions: ['Reservations.View'],
    preload: loadReservationsPage,
  },
  {
    label: 'QR bàn',
    section: 'Vận hành',
    icon: '▥',
    permissions: ['Tables.View'],
    preload: loadTableQrCodesPage,
  },
  {
    label: 'Thực đơn',
    section: 'Sản phẩm',
    icon: '☷',
    permissions: ['Menu.View'],
    preload: loadMenuManagementPage,
  },
  {
    label: 'Đơn hàng',
    section: 'Vận hành',
    icon: '▣',
    permissions: ['Orders.View'],
    preload: loadOrdersPage,
  },
  {
    label: 'Bếp',
    section: 'Vận hành',
    icon: '♨',
    permissions: ['Kitchen.View'],
    preload: loadKitchenPage,
  },
  {
    label: 'Thanh toán',
    section: 'Vận hành',
    icon: '₫',
    permissions: ['Payments.View'],
    preload: loadPaymentsPage,
  },
  {
    label: 'Hóa đơn',
    section: 'Kiểm soát',
    icon: '▤',
    permissions: ['Invoices.View'],
    preload: loadInvoicesPage,
  },
  {
    label: 'Báo cáo doanh thu',
    section: 'Kiểm soát',
    icon: '↗',
    permissions: ['RevenueReports.View'],
    preload: loadRevenueReportsPage,
  },
  {
    label: 'Khuyến mãi',
    section: 'Sản phẩm',
    icon: '◇',
    permissions: ['Promotions.View', 'PromotionUsages.View'],
    preload: loadPromotionsPage,
  },
  {
    label: 'Kho nguyên liệu',
    section: 'Sản phẩm',
    icon: '▧',
    permissions: ['Inventory.View'],
    preload: loadInventoryPage,
  },
  {
    label: 'Nhật ký hoạt động',
    section: 'Kiểm soát',
    icon: '◴',
    permissions: ['ActivityLogs.View'],
    preload: loadActivityLogsPage,
  },
  {
    label: 'Bảo mật tài khoản',
    section: 'Hệ thống',
    icon: '◈',
    preload: loadAccountSecurityPage,
  },
  {
    label: 'Cấu hình nhà hàng',
    section: 'Hệ thống',
    icon: '⚙',
    permissions: ['RestaurantSettings.View'],
    preload: loadRestaurantSettingsPage,
  },
]

const ADMIN_ROLES = new Set(['Admin', 'Manager', 'Cashier', 'Kitchen', 'Staff'])

function getQrOrderToken() {
  if (typeof window === 'undefined') return null
  const match = window.location.pathname.match(/^\/qr-order\/([^/]+)\/?$/i)
  if (!match?.[1]) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

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

function ModuleLoading({ label }: { label: string }) {
  return (
    <section className="module-loading" role="status" aria-live="polite">
      <span className="account-security-spinner" />
      <div>
        <strong>Đang tải {label}…</strong>
        <small>
          Hệ thống chỉ tải module bạn đang mở để khởi động nhanh hơn.
        </small>
      </div>
    </section>
  )
}

function QrOrderLoading() {
  return (
    <main className="qr-order-page qr-order-state-page">
      <div className="qr-order-state-card" role="status">
        <span className="qr-order-spinner" />
        <h1>Đang mở trang gọi món…</h1>
        <p>Vui lòng chờ trong giây lát.</p>
      </div>
    </main>
  )
}

export default function App() {
  const qrOrderToken = getQrOrderToken()
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
    if (qrOrderToken) {
      setRestoringSession(false)
      return
    }

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
  }, [acceptAuthentication, clearSession, qrOrderToken])

  useEffect(() => {
    if (qrOrderToken || !result?.token || !result.refreshToken) return
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
  }, [acceptAuthentication, clearSession, qrOrderToken, result?.refreshToken, result?.token])

  if (qrOrderToken) {
    return (
      <Suspense fallback={<QrOrderLoading />}>
        <QrOrderPage token={qrOrderToken} />
      </Suspense>
    )
  }

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
          <span className="auth-restoring-spinner" />
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
  const permissionSet = new Set(authenticatedResult.permissions ?? [])
  const visibleNavigation =
    authenticatedResult.role === 'Admin'
      ? navigation
      : navigation.filter(
          (item) =>
            !item.permissions ||
            item.permissions.some((permission) =>
              permissionSet.has(permission),
            ),
        )
  const visibleNavigationGroups = Array.from(
    new Set(visibleNavigation.map((item) => item.section)),
  ).map((section) => ({
    section,
    items: visibleNavigation.filter((item) => item.section === section),
  }))
  const visibleLabels = new Set(visibleNavigation.map((item) => item.label))
  const currentItem = visibleLabels.has(activeItem)
    ? activeItem
    : (visibleNavigation[0]?.label ?? 'Bảo mật tài khoản')

  const displayName =
    [authenticatedResult.ho, authenticatedResult.ten]
      .filter(Boolean)
      .join(' ') ||
    authenticatedResult.email ||
    'Quản trị viên'

  function navigateTo(label: string) {
    const target = visibleNavigation.find((item) => item.label === label)
    if (!target) return
    void target.preload?.()
    setActiveItem(label)
  }

  function renderContent() {
    switch (currentItem) {
      case 'Nhân viên':
        return <EmployeePage />
      case 'Khách hàng':
        return <CustomerManagementPage />
      case 'Ca làm việc & phân ca':
        return <ShiftsSchedulingPage />
      case 'Tài khoản & phân quyền':
        return <AccessManagementPage />
      case 'Khu vực & bàn':
        return <AreasTablesPage />
      case 'Đặt bàn':
        return <ReservationsPage />
      case 'QR bàn':
        return <TableQrCodesPage />
      case 'Thực đơn':
        return <MenuManagementPage />
      case 'Đơn hàng':
        return <OrdersPage />
      case 'Bếp':
        return <KitchenPage />
      case 'Thanh toán':
        return <PaymentsPage />
      case 'Hóa đơn':
        return <InvoicesPage />
      case 'Báo cáo doanh thu':
        return <RevenueReportsPage />
      case 'Khuyến mãi':
        return <PromotionsPage />
      case 'Kho nguyên liệu':
        return <InventoryPage />
      case 'Nhật ký hoạt động':
        return <ActivityLogsPage role={authenticatedResult.role} />
      case 'Bảo mật tài khoản':
        return (
          <AccountSecurityPage
            auth={authenticatedResult}
            onRequireLogin={clearSession}
          />
        )
      case 'Cấu hình nhà hàng':
        return <RestaurantSettingsPage />
      default:
        return (
          <DashboardPage
            name={authenticatedResult.ten ?? 'Admin'}
            onNavigate={navigateTo}
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
        <nav aria-label="Điều hướng quản trị">
          {visibleNavigationGroups.map(({ section, items }) => (
            <div className="nav-section" key={section}>
              <span className="nav-section-label">{section}</span>
              {items.map(({ label, icon, preload }) => (
                <button
                  type="button"
                  key={label}
                  className={currentItem === label ? 'active' : ''}
                  aria-current={currentItem === label ? 'page' : undefined}
                  onMouseEnter={() => void preload?.()}
                  onFocus={() => void preload?.()}
                  onClick={() => navigateTo(label)}
                >
                  <span aria-hidden="true">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="system-status">
            <span className="status-dot" />
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
            <h1>{currentItem}</h1>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className={`profile profile-button${
                currentItem === 'Bảo mật tài khoản' ? ' active' : ''
              }`}
              onMouseEnter={() => void loadAccountSecurityPage()}
              onFocus={() => void loadAccountSecurityPage()}
              onClick={() => navigateTo('Bảo mật tài khoản')}
              aria-label="Mở bảo mật tài khoản"
            >
              <span>{displayName.charAt(0).toLocaleUpperCase('vi')}</span>
              <div>
                <strong>{displayName}</strong>
                <small>{authenticatedResult.role ?? 'Admin'}</small>
              </div>
            </button>
            <button
              type="button"
              className="logout"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
            >
              {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </button>
          </div>
        </header>
        <Suspense fallback={<ModuleLoading label={currentItem} />}>
          {renderContent()}
        </Suspense>
      </main>
      <ConfirmDialogHost />
    </div>
  )
}