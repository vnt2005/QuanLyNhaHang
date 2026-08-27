import { lazy, Suspense, useEffect, useState } from 'react'
import {
  AdminSessionProvider,
  useAdminSession,
} from './context/AdminSessionContext'
import AuthPage from './pages/AuthPage'
import { ConfirmDialogHost } from './components/ConfirmDialog'
import NotificationCenter from './components/NotificationCenter'

const loadAccessManagementPage = () => import('./pages/AccessManagementPage')
const loadAccountSecurityPage = () => import('./pages/AccountSecurityPage')
const loadActivityLogsPage = () => import('./pages/ActivityLogsPage')
const loadAreasTablesPage = () => import('./pages/AreasTablesPage')
const loadCustomerManagementPage = () =>
  import('./pages/CustomerManagementPage')
const loadDashboardPage = () => import('./pages/DashboardPage')
const loadEmployeePage = () => import('./pages/EmployeePage')
const loadInvoicesPage = () => import('./pages/InvoicesPage')
const loadKitchenPage = () => import('./pages/KitchenPage')
const loadMenuManagementPage = () => import('./pages/MenuManagementPage')
const loadOrdersPage = () => import('./pages/OrdersPage')
const loadPaymentsPage = () => import('./pages/PaymentsPage')
const loadPromotionsPage = () => import('./pages/PromotionsPage')
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
const KitchenPage = lazy(loadKitchenPage)
const MenuManagementPage = lazy(loadMenuManagementPage)
const OrdersPage = lazy(loadOrdersPage)
const PaymentsPage = lazy(loadPaymentsPage)
const PromotionsPage = lazy(loadPromotionsPage)
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

function getCustomerWebsiteQrUrl(token: string) {
  const configuredUrl = (
    import.meta.env.VITE_CUSTOMER_APP_URL as string | undefined
  )?.trim()
  const isLocal = window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
  const baseUrl = configuredUrl
    || (isLocal
      ? `${window.location.protocol}//${window.location.hostname}:5174`
      : '')

  if (!baseUrl) return null
  return `${baseUrl.replace(/\/+$/, '')}/qr-order/${encodeURIComponent(token)}`
}

function CustomerWebsiteRedirect({ token }: { token: string }) {
  const destination = getCustomerWebsiteQrUrl(token)

  useEffect(() => {
    if (destination) window.location.replace(destination)
  }, [destination])

  return (
    <main className="qr-order-page qr-order-state-page">
      <div className="qr-order-state-card" role="status">
        <span className="qr-order-spinner" />
        <h1>
          {destination
            ? 'Đang mở website khách hàng…'
            : 'Chưa cấu hình website khách hàng'}
        </h1>
        <p>
          {destination
            ? 'Trang gọi món được phục vụ trên website riêng dành cho khách.'
            : 'Hãy cấu hình VITE_CUSTOMER_APP_URL cho cổng quản trị.'}
        </p>
      </div>
    </main>
  )
}

function AdminConsole() {
  const {
    acceptAuthentication,
    authMessage,
    clearSession,
    loggingOut,
    logout,
    restoringSession,
    result,
  } = useAdminSession()
  const [activeItem, setActiveItem] = useState('Tổng quan')

  useEffect(() => {
    if (!result) setActiveItem('Tổng quan')
  }, [result])

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
            <NotificationCenter onNavigate={navigateTo} />
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
              onClick={() => void logout()}
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


export default function App() {
  const qrOrderToken = getQrOrderToken()

  if (qrOrderToken) {
    return <CustomerWebsiteRedirect token={qrOrderToken} />
  }

  return (
    <AdminSessionProvider>
      <AdminConsole />
    </AdminSessionProvider>
  )
}
