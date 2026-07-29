import { FormEvent, useState } from 'react'
import { login, type LoginResult } from './api/auth'
import AccessManagementPage from './pages/AccessManagementPage'
import ActivityLogsPage from './pages/ActivityLogsPage'
import AreasTablesPage from './pages/AreasTablesPage'
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
  ['Tổng quan', '⌂'], ['Nhân viên', '◉'], ['Ca làm việc & phân ca', '◷'], ['Tài khoản & phân quyền', '◆'],
  ['Khu vực & bàn', '▦'], ['Đặt bàn', '◫'], ['QR bàn', '▥'], ['Thực đơn', '☷'], ['Đơn hàng', '▣'],
  ['Bếp', '♨'], ['Thanh toán', '₫'], ['Hóa đơn', '▤'], ['Báo cáo doanh thu', '↗'],
  ['Khuyến mãi', '◇'], ['Kho nguyên liệu', '▧'], ['Nhật ký hoạt động', '◴'],
  ['Cấu hình nhà hàng', '⚙'],
]

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<LoginResult | null>(null)
  const [activeItem, setActiveItem] = useState('Tổng quan')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const loginResult = await login({email, password})
      if (loginResult.token) sessionStorage.setItem('accessToken', loginResult.token)
      if (loginResult.refreshToken) localStorage.setItem('refreshToken', loginResult.refreshToken)
      setPassword('')
      setResult(loginResult)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Đã xảy ra lỗi không xác định.')
    } finally { setLoading(false) }
  }

  function logout() {
    sessionStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setResult(null)
    setPassword('')
  }

  if (!result || result.requiresTwoFactor) return <main className="app-shell"><section className="brand-panel"><span className="eyebrow">RESTAURANT OPERATIONS</span><h1>Quản lý nhà hàng rõ ràng, nhanh chóng và đồng bộ.</h1><p>Giao diện quản trị React kết nối trực tiếp với ASP.NET Core API hiện tại.</p><div className="status-card"><span className="status-dot"/> Backend sẵn sàng cho frontend tại cổng 5173</div></section><section className="login-panel"><form className="login-card" onSubmit={handleSubmit}><div><span className="eyebrow">ADMIN PORTAL</span><h2>Đăng nhập hệ thống</h2><p>Sử dụng tài khoản đã có trong backend.</p></div><label>Email<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required/></label><label>Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required/></label>{error && <div className="alert error">{error}</div>}<button disabled={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button></form></section></main>

  const displayName = [result.ho, result.ten].filter(Boolean).join(' ') || result.email || 'Quản trị viên'
  const content = activeItem === 'Nhân viên'
    ? <EmployeePage/>
    : activeItem === 'Ca làm việc & phân ca'
      ? <ShiftsSchedulingPage/>
      : activeItem === 'Tài khoản & phân quyền'
        ? <AccessManagementPage/>
        : activeItem === 'Khu vực & bàn'
          ? <AreasTablesPage/>
          : activeItem === 'Đặt bàn'
            ? <ReservationsPage/>
            : activeItem === 'QR bàn'
              ? <TableQrCodesPage/>
              : activeItem === 'Thực đơn'
                ? <MenuManagementPage/>
                : activeItem === 'Đơn hàng'
                  ? <OrdersPage/>
                  : activeItem === 'Bếp'
                    ? <KitchenPage/>
                    : activeItem === 'Thanh toán'
                      ? <PaymentsPage/>
                      : activeItem === 'Hóa đơn'
                        ? <InvoicesPage/>
                        : activeItem === 'Báo cáo doanh thu'
                          ? <RevenueReportsPage/>
                          : activeItem === 'Cấu hình nhà hàng'
                            ? <RestaurantSettingsPage/>
                            : activeItem === 'Kho nguyên liệu'
                              ? <InventoryPage/>
                              : activeItem === 'Nhật ký hoạt động'
                                ? <ActivityLogsPage role={result.role}/>
                                : activeItem === 'Khuyến mãi'
                                  ? <PromotionsPage/>
                                  : <DashboardPage
                                    name={result.ten ?? 'Admin'}
                                    onNavigate={setActiveItem}
                                  />

  return <div className="admin-layout"><aside className="sidebar"><div className="logo"><span>QL</span><div><strong>Nhà Hàng</strong><small>Admin Console</small></div></div><nav>{navigation.map(([label, icon]) => <button key={label} className={activeItem === label ? 'active' : ''} onClick={() => setActiveItem(label)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-footer"><div className="system-status"><span className="status-dot"/><div><strong>Hệ thống ổn định</strong><small>API đang kết nối</small></div></div></div></aside><main className="dashboard"><header className="topbar"><div><span className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</span><h1>{activeItem}</h1></div><div className="topbar-actions"><div className="profile"><span>{displayName.charAt(0).toUpperCase()}</span><div><strong>{displayName}</strong><small>{result.role ?? 'Admin'}</small></div></div><button className="logout" onClick={logout}>Đăng xuất</button></div></header>{content}</main></div>
}
