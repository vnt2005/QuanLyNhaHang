import { FormEvent, useEffect, useState } from 'react'
import { login, type LoginResult } from './api/auth'
import {
  createEmployee,
  deactivateEmployee,
  getEmployees,
  updateEmployee,
  type Employee,
  type EmployeeForm,
} from './api/employees'

const navigation = [
  ['Tổng quan', '⌂'], ['Nhân viên', '◉'], ['Tài khoản & phân quyền', '◆'],
  ['Khu vực & bàn', '▦'], ['Thực đơn', '☷'], ['Đơn hàng', '▣'],
  ['Bếp', '♨'], ['Thanh toán', '₫'], ['Hóa đơn', '▤'], ['Báo cáo doanh thu', '↗'],
]
const stats = [
  ['Doanh thu hôm nay', '18.750.000 ₫', '+12,5%'], ['Đơn đang phục vụ', '24', '6 đơn mới'],
  ['Bàn đang sử dụng', '18 / 30', '60% công suất'], ['Món chờ bếp', '11', '3 món ưu tiên'],
]
const emptyForm: EmployeeForm = {
  employeeCode: '', ho: '', ten: '', email: '', phoneNumber: '', password: '', role: 'Staff',
  dateOfBirth: '', address: '', position: '', baseSalary: 0,
  hireDate: new Date().toISOString().slice(0, 10), isActive: true,
}

function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<EmployeeForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load(targetPage = page, search = keyword) {
    setLoading(true); setError('')
    try {
      const result = await getEmployees(search, targetPage, 10)
      setEmployees(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(result.totalPages || 1, 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được danh sách nhân viên.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load(1, '') }, [])

  function openCreate() { setForm(emptyForm); setError(''); setMessage(''); setModalOpen(true) }
  function openEdit(employee: Employee) {
    setForm({
      id: employee.id, employeeCode: employee.employeeCode, ho: employee.ho ?? '', ten: employee.ten,
      email: employee.email ?? '', phoneNumber: employee.phoneNumber, password: '', role: employee.role ?? 'Staff',
      dateOfBirth: employee.dateOfBirth?.slice(0, 10) ?? '', address: employee.address ?? '',
      position: employee.position, baseSalary: employee.baseSalary, hireDate: employee.hireDate.slice(0, 10),
      isActive: employee.isActive,
    })
    setError(''); setMessage(''); setModalOpen(true)
  }

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setMessage('')
    try {
      const result = form.id ? await updateEmployee(form) : await createEmployee(form)
      setMessage(result.message ?? (form.id ? 'Cập nhật thành công.' : 'Tạo nhân viên thành công.'))
      setModalOpen(false)
      await load(form.id ? page : 1, keyword)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không lưu được nhân viên.')
    } finally { setSaving(false) }
  }

  async function removeEmployee(employee: Employee) {
    if (!confirm(`Ngừng hoạt động nhân viên ${employee.ho ?? ''} ${employee.ten}?`)) return
    setError(''); setMessage('')
    try {
      const result = await deactivateEmployee(employee.id)
      setMessage(result.message ?? 'Đã ngừng hoạt động nhân viên.')
      await load(page, keyword)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không thể ngừng hoạt động.') }
  }

  return (
    <section className="employees-page">
      <div className="page-toolbar">
        <div><h2>Danh sách nhân viên</h2><p>Quản lý hồ sơ, tài khoản và trạng thái làm việc.</p></div>
        <button className="primary-button" onClick={openCreate}>+ Thêm nhân viên</button>
      </div>
      <div className="employee-summary">
        <article><span>Tổng nhân viên</span><strong>{totalCount}</strong></article>
        <article><span>Đang hoạt động</span><strong>{employees.filter(x => x.isActive).length}</strong></article>
        <article><span>Có tài khoản</span><strong>{employees.filter(x => x.userId).length}</strong></article>
      </div>
      <div className="table-card">
        <form className="table-filters" onSubmit={(event) => { event.preventDefault(); void load(1, keyword) }}>
          <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm mã, tên, email, số điện thoại, vị trí..." />
          <button type="submit">Tìm kiếm</button>
          {keyword && <button type="button" onClick={() => { setKeyword(''); void load(1, '') }}>Xóa lọc</button>}
        </form>
        {message && <div className="inline-alert success">{message}</div>}
        {error && <div className="inline-alert error">{error}</div>}
        <div className="table-scroll">
          <table>
            <thead><tr><th>Nhân viên</th><th>Liên hệ</th><th>Vị trí</th><th>Vai trò</th><th>Lương cơ bản</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="empty-state">Đang tải dữ liệu...</td></tr> : employees.length === 0 ? <tr><td colSpan={7} className="empty-state">Chưa có nhân viên phù hợp.</td></tr> : employees.map(employee => (
                <tr key={employee.id}>
                  <td><div className="employee-cell"><span>{employee.ten.charAt(0).toUpperCase()}</span><div><strong>{[employee.ho, employee.ten].filter(Boolean).join(' ')}</strong><small>{employee.employeeCode}</small></div></div></td>
                  <td><strong>{employee.email || 'Chưa có email'}</strong><small>{employee.phoneNumber}</small></td>
                  <td>{employee.position}</td><td>{employee.role || 'Chưa gán'}</td>
                  <td>{employee.baseSalary.toLocaleString('vi-VN')} ₫</td>
                  <td><span className={`status-badge ${employee.isActive ? 'active' : 'inactive'}`}>{employee.isActive ? 'Đang làm việc' : 'Ngừng hoạt động'}</span></td>
                  <td><div className="row-actions"><button onClick={() => openEdit(employee)}>Sửa</button>{employee.isActive && <button className="danger" onClick={() => void removeEmployee(employee)}>Ngừng</button>}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination"><span>Trang {page}/{totalPages}</span><div><button disabled={page <= 1} onClick={() => void load(page - 1, keyword)}>Trước</button><button disabled={page >= totalPages} onClick={() => void load(page + 1, keyword)}>Sau</button></div></div>
      </div>

      {modalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}><div className="employee-modal" onMouseDown={event => event.stopPropagation()}>
        <div className="modal-heading"><div><h2>{form.id ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}</h2><p>Thông tin hồ sơ và tài khoản đăng nhập.</p></div><button onClick={() => setModalOpen(false)}>×</button></div>
        <form onSubmit={submitEmployee} className="employee-form">
          <label>Mã nhân viên<input required value={form.employeeCode} onChange={e => setForm({...form, employeeCode:e.target.value})}/></label>
          <label>Họ<input value={form.ho} onChange={e => setForm({...form, ho:e.target.value})}/></label>
          <label>Tên<input required value={form.ten} onChange={e => setForm({...form, ten:e.target.value})}/></label>
          <label>Email<input type="email" required value={form.email} onChange={e => setForm({...form, email:e.target.value})}/></label>
          <label>Số điện thoại<input required value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber:e.target.value})}/></label>
          <label>Mật khẩu<input type="password" required={!form.id} placeholder={form.id ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'} value={form.password} onChange={e => setForm({...form, password:e.target.value})}/></label>
          <label>Vai trò<select value={form.role} onChange={e => setForm({...form, role:e.target.value})}><option>Staff</option><option>Cashier</option><option>Kitchen</option><option>Manager</option><option>Admin</option></select></label>
          <label>Vị trí công việc<input required value={form.position} onChange={e => setForm({...form, position:e.target.value})}/></label>
          <label>Lương cơ bản<input type="number" min="0" required value={form.baseSalary} onChange={e => setForm({...form, baseSalary:Number(e.target.value)})}/></label>
          <label>Ngày vào làm<input type="date" required value={form.hireDate} onChange={e => setForm({...form, hireDate:e.target.value})}/></label>
          <label>Ngày sinh<input type="date" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth:e.target.value})}/></label>
          <label className="wide-field">Địa chỉ<input value={form.address} onChange={e => setForm({...form, address:e.target.value})}/></label>
          {form.id && <label className="checkbox-field"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive:e.target.checked})}/> Nhân viên đang hoạt động</label>}
          <div className="modal-actions"><button type="button" onClick={() => setModalOpen(false)}>Hủy</button><button className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu nhân viên'}</button></div>
        </form>
      </div></div>}
    </section>
  )
}

function DashboardHome({ name }: { name: string }) {
  return <><section className="welcome-card"><div><span>Thứ Sáu, 24 tháng 7</span><h2>Chào mừng trở lại, {name}!</h2><p>Theo dõi hoạt động nhà hàng và xử lý nhanh các công việc cần ưu tiên.</p></div><button>+ Tạo đơn hàng</button></section><section className="stat-grid">{stats.map(([label,value,note],index)=><article className="stat-card" key={label}><div className={`stat-icon icon-${index}`}>{['₫','▣','▦','♨'][index]}</div><p>{label}</p><h3>{value}</h3><span>{note}</span></article>)}</section><section className="dashboard-grid"><article className="panel revenue-panel"><div className="panel-heading"><div><h3>Doanh thu 7 ngày</h3><p>So sánh doanh thu theo ngày</p></div></div><div className="chart"><div className="y-labels"><span>30tr</span><span>20tr</span><span>10tr</span><span>0</span></div><div className="bars">{[48,62,55,82,70,94,76].map((height,index)=><div className="bar-column" key={index}><div className="bar" style={{height:`${height}%`}}/><span>T{index+2}</span></div>)}</div></div></article><article className="panel"><div className="panel-heading"><div><h3>Hoạt động gần đây</h3><p>Cập nhật trực tiếp từ hệ thống</p></div></div><div className="activity-list">{[['Đơn #ORD-2407-018 đã thanh toán','Bàn A08 • 1.250.000 ₫'],['Bếp hoàn thành đơn #ORD-2407-017','6 món • Bàn VIP 03'],['Đặt bàn mới đã được xác nhận','Nguyễn Minh Anh • 19:30']].map(([title,detail])=><div className="activity" key={title}><span className="activity-dot"/><div><strong>{title}</strong><p>{detail}</p></div></div>)}</div></article></section></>
}

export default function App() {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [result,setResult]=useState<LoginResult|null>(null); const [activeItem,setActiveItem]=useState('Tổng quan')
  async function handleSubmit(event:FormEvent<HTMLFormElement>){event.preventDefault();setLoading(true);setError('');try{const loginResult=await login({email,password});if(loginResult.token)sessionStorage.setItem('accessToken',loginResult.token);if(loginResult.refreshToken)localStorage.setItem('refreshToken',loginResult.refreshToken);setResult(loginResult)}catch(exception){setError(exception instanceof Error?exception.message:'Đã xảy ra lỗi không xác định.')}finally{setLoading(false)}}
  function logout(){sessionStorage.removeItem('accessToken');localStorage.removeItem('refreshToken');setResult(null);setPassword('')}
  if(!result||result.requiresTwoFactor)return <main className="app-shell"><section className="brand-panel"><span className="eyebrow">RESTAURANT OPERATIONS</span><h1>Quản lý nhà hàng rõ ràng, nhanh chóng và đồng bộ.</h1><p>Giao diện quản trị React kết nối trực tiếp với ASP.NET Core API hiện tại.</p><div className="status-card"><span className="status-dot"/> Backend sẵn sàng cho frontend tại cổng 5173</div></section><section className="login-panel"><form className="login-card" onSubmit={handleSubmit}><div><span className="eyebrow">ADMIN PORTAL</span><h2>Đăng nhập hệ thống</h2><p>Sử dụng tài khoản đã có trong backend.</p></div><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Mật khẩu<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{error&&<div className="alert error">{error}</div>}<button disabled={loading}>{loading?'Đang đăng nhập…':'Đăng nhập'}</button></form></section></main>
  const displayName=[result.ho,result.ten].filter(Boolean).join(' ')||result.email||'Quản trị viên'
  return <div className="admin-layout"><aside className="sidebar"><div className="logo"><span>QL</span><div><strong>Nhà Hàng</strong><small>Admin Console</small></div></div><nav>{navigation.map(([label,icon])=><button key={label} className={activeItem===label?'active':''} onClick={()=>setActiveItem(label)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-footer"><div className="system-status"><span className="status-dot"/><div><strong>Hệ thống ổn định</strong><small>API đang kết nối</small></div></div></div></aside><main className="dashboard"><header className="topbar"><div><span className="eyebrow">TRUNG TÂM ĐIỀU HÀNH</span><h1>{activeItem}</h1></div><div className="topbar-actions"><div className="profile"><span>{displayName.charAt(0).toUpperCase()}</span><div><strong>{displayName}</strong><small>{result.role??'Admin'}</small></div></div><button className="logout" onClick={logout}>Đăng xuất</button></div></header>{activeItem==='Nhân viên'?<EmployeePage/>:<DashboardHome name={result.ten??'Admin'}/>}</main></div>
}
