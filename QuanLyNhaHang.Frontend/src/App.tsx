import { FormEvent, useState } from 'react'
import { login, type LoginResult } from './api/auth'

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

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<LoginResult | null>(null)
  const [activeItem, setActiveItem] = useState('Tổng quan')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const loginResult = await login({ email, password })
      if (loginResult.token) sessionStorage.setItem('accessToken', loginResult.token)
      if (loginResult.refreshToken) localStorage.setItem('refreshToken', loginResult.refreshToken)
      setResult(loginResult)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Đã xảy ra lỗi không xác định.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    sessionStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setResult(null)
    setPassword('')
  }

  if (!result || result.requiresTwoFactor) {
    return (
      <main className="app-shell">
        <section className="brand-panel">
          <span className="eyebrow">RESTAURANT OPERATIONS</span>
          <h1>Quản lý nhà hàng rõ ràng, nhanh chóng và đồng bộ.</h1>
          <p>Giao diện quản trị React kết nối trực tiếp với ASP.NET Core API hiện tại.</p>
          <div className="status-card"><span className="status-dot" /> Backend sẵn sàng cho frontend tại cổng 5173</div>
        </section>
        <section className="login-panel">
          <form className="login-card" onSubmit={handleSubmit}>
            <div><span className="eyebrow">ADMIN PORTAL</span><h2>Đăng nhập hệ thống</h2><p>Sử dụng tài khoản đã có trong backend.</p></div>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" autoComplete="email" required /></label>
            <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" required /></label>
            {error && <div className="alert error">{error}</div>}
            {result?.requiresTwoFactor && <div className="alert error">Tài khoản yêu cầu xác thực hai yếu tố. Màn hình xác minh sẽ được bổ sung ở bước tiếp theo.</div>}
            <button type="submit" disabled={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
            <small>API: {import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'}</small>
          </form>
        </section>
      </main>
    )
  }

  const displayName = [result.ho, result.ten].filter(Boolean).join(' ') || result.email || 'Quản trị viên'

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="logo"><span>QL</span><div><strong>Nhà Hàng</strong><small>Admin Console</small></div></div>
        <nav>{navigation.map(([label, icon]) => <button key={label} className={activeItem === label ? 'active' : ''} onClick={() => setActiveItem(label)}><span>{icon}</span>{label}</button>)}</nav>
        <div className="sidebar-footer"><div className="system-status"><span className="status-dot" /><div><strong>Hệ thống ổn định</strong><small>API đang kết nối</small></div></div></div>
      </aside>

      <main className="dashboard">
        <header className="topbar">
          <div><span className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</span><h1>{activeItem}</h1></div>
          <div className="topbar-actions"><button className="icon-button">⌕</button><button className="icon-button">◌</button><div className="profile"><span>{displayName.charAt(0).toUpperCase()}</span><div><strong>{displayName}</strong><small>{result.role ?? 'Admin'}</small></div></div><button className="logout" onClick={logout}>Đăng xuất</button></div>
        </header>

        <section className="welcome-card"><div><span>Thứ Sáu, 24 tháng 7</span><h2>Chào mừng trở lại, {result.ten ?? 'Admin'}!</h2><p>Theo dõi hoạt động nhà hàng và xử lý nhanh các công việc cần ưu tiên.</p></div><button>+ Tạo đơn hàng</button></section>

        <section className="stat-grid">{stats.map(([label, value, note], index) => <article className="stat-card" key={label}><div className={`stat-icon icon-${index}`}>{['₫', '▣', '▦', '♨'][index]}</div><p>{label}</p><h3>{value}</h3><span>{note}</span></article>)}</section>

        <section className="dashboard-grid">
          <article className="panel revenue-panel"><div className="panel-heading"><div><h3>Doanh thu 7 ngày</h3><p>So sánh doanh thu theo ngày</p></div><button>7 ngày gần nhất⌄</button></div><div className="chart"><div className="y-labels"><span>30tr</span><span>20tr</span><span>10tr</span><span>0</span></div><div className="bars">{[48, 62, 55, 82, 70, 94, 76].map((height, index) => <div className="bar-column" key={index}><div className="bar" style={{ height: `${height}%` }} /><span>T{index + 2}</span></div>)}</div></div></article>
          <article className="panel"><div className="panel-heading"><div><h3>Hoạt động gần đây</h3><p>Cập nhật trực tiếp từ hệ thống</p></div><button>Xem tất cả</button></div><div className="activity-list">{[['Đơn #ORD-2407-018 đã thanh toán','Bàn A08 • 1.250.000 ₫','2 phút trước'],['Bếp hoàn thành đơn #ORD-2407-017','6 món • Bàn VIP 03','5 phút trước'],['Đặt bàn mới đã được xác nhận','Nguyễn Minh Anh • 19:30','12 phút trước'],['Kho nguyên liệu vừa được cập nhật','Thịt bò giảm còn 8,5 kg','18 phút trước']].map(([title, detail, time]) => <div className="activity" key={title}><span className="activity-dot"/><div><strong>{title}</strong><p>{detail}</p></div><small>{time}</small></div>)}</div></article>
        </section>
      </main>
    </div>
  )
}
