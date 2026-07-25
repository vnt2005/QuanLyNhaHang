import { FormEvent, useState } from 'react'
import { login, type LoginResult } from './api/auth'
import AccessManagementPage from './pages/AccessManagementPage'
import AreasTablesPage from './pages/AreasTablesPage'
import EmployeePage from './pages/EmployeePage'
import KitchenPage from './pages/KitchenPage'
import MenuManagementPage from './pages/MenuManagementPage'
import OrdersPage from './pages/OrdersPage'

const navigation = [
  ['Tổng quan', '⌂'], ['Nhân viên', '◉'], ['Tài khoản & phân quyền', '◆'],
  ['Khu vực & bàn', '▦'], ['Thực đơn', '☷'], ['Đơn hàng', '▣'],
  ['Bếp', '♨'], ['Thanh toán', '₫'], ['Hóa đơn', '▤'], ['Báo cáo doanh thu', '↗'],
]

const stats = [
  ['Doanh thu hôm nay', '18.750.000 ₫', '+12,5%'],
  ['Đơn đang phục vụ', '24', '6 đơn mới'],
  ['Bàn đang sử dụng', '18 / 30', '60% công suất'],
  ['Món chờ bếp', '11', '3 món ưu tiên'],
]

function DashboardHome({ name }: { name: string }) {
  return <>
    <section className="welcome-card"><div><span>Thứ Sáu, 24 tháng 7</span><h2>Chào mừng trở lại, {name}!</h2><p>Theo dõi hoạt động nhà hàng và xử lý nhanh các công việc cần ưu tiên.</p></div><button>+ Tạo đơn hàng</button></section>
    <section className="stat-grid">{stats.map(([label, value, note], index) => <article className="stat-card" key={label}><div className={`stat-icon icon-${index}`}>{['₫', '▣', '▦', '♨'][index]}</div><p>{label}</p><h3>{value}</h3><span>{note}</span></article>)}</section>
    <section className="dashboard-grid"><article className="panel revenue-panel"><div className="panel-heading"><div><h3>Doanh thu 7 ngày</h3><p>So sánh doanh thu theo ngày</p></div></div><div className="chart"><div className="y-labels"><span>30tr</span><span>20tr</span><span>10tr</span><span>0</span></div><div className="bars">{[48, 62, 55, 82, 70, 94, 76].map((height, index) => <div className="bar-column" key={index}><div className="bar" style={{height:`${height}%`}}/><span>T{index + 2}</span></div>)}</div></div></article><article className="panel"><div className="panel-heading"><div><h3>Hoạt động gần đây</h3><p>Cập nhật trực tiếp từ hệ thống</p></div></div><div className="activity-list">{[['Đơn #ORD-2407-018 đã thanh toán', 'Bàn A08 • 1.250.000 ₫'], ['Bếp hoàn thành đơn #ORD-2407-017', '6 món • Bàn VIP 03'], ['Đặt bàn mới đã được xác nhận', 'Nguyễn Minh Anh • 19:30']].map(([title, detail]) => <div className="activity" key={title}><span className="activity-dot"/><div><strong>{title}</strong><p>{detail}</p></div></div>)}</div></article></section>
  </>
}

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
    : activeItem === 'Tài khoản & phân quyền'
      ? <AccessManagementPage/>
      : activeItem === 'Khu vực & bàn'
        ? <AreasTablesPage/>
        : activeItem === 'Thực đơn'
          ? <MenuManagementPage/>
          : activeItem === 'Đơn hàng'
            ? <OrdersPage/>
            : activeItem === 'Bếp'
              ? <KitchenPage/>
              : <DashboardHome name={result.ten ?? 'Admin'}/>

  return <div className="admin-layout"><aside className="sidebar"><div className="logo"><span>QL</span><div><strong>Nhà Hàng</strong><small>Admin Console</small></div></div><nav>{navigation.map(([label, icon]) => <button key={label} className={activeItem === label ? 'active' : ''} onClick={() => setActiveItem(label)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-footer"><div className="system-status"><span className="status-dot"/><div><strong>Hệ thống ổn định</strong><small>API đang kết nối</small></div></div></div></aside><main className="dashboard"><header className="topbar"><div><span className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</span><h1>{activeItem}</h1></div><div className="topbar-actions"><div className="profile"><span>{displayName.charAt(0).toUpperCase()}</span><div><strong>{displayName}</strong><small>{result.role ?? 'Admin'}</small></div></div><button className="logout" onClick={logout}>Đăng xuất</button></div></header>{content}</main></div>
}
