import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  createEmployee,
  deactivateEmployee,
  getEmployees,
  updateEmployee,
  type Employee,
  type EmployeeForm,
} from '../api/employees'
import { confirmAction } from '../design-system/confirmDialog'
import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'

const emptyForm: EmployeeForm = {
  employeeCode: '',
  ho: '',
  ten: '',
  email: '',
  phoneNumber: '',
  password: '',
  role: 'Staff',
  dateOfBirth: '',
  address: '',
  position: '',
  baseSalary: 0,
  hireDate: new Date().toISOString().slice(0, 10),
  isActive: true,
}

const roleLabels: Record<string, string> = {
  Staff: 'Phục vụ bàn (Staff)',
  Cashier: 'Thu ngân (Cashier)',
  Kitchen: 'Bếp (Kitchen)',
  Manager: 'Quản lý (Manager)',
  Admin: 'Quản trị (Admin)',
}

function formatMoney(value: number) {
  return `${value.toLocaleString('vi-VN')} ₫`
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa cập nhật'
  const normalized = value.slice(0, 10)
  const [year, month, day] = normalized.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.5 6.5 17.5 10.5" />
      <path d="M4 20h4.2L19 9.2a2.8 2.8 0 0 0-4-4L4.2 16 4 20Z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 8.5v7M14.5 8.5v7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V5.7c0-.7.6-1.2 1.2-1.2h3.6c.7 0 1.2.6 1.2 1.2v1.8M3.5 12h17M10 12v1.5h4V12" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.3 3.8 10 7.2 8.4 9.4c1.3 2.7 3.5 4.8 6.2 6.2l2.2-1.6 3.4 2.7-.6 3c-.2.9-1 1.5-1.9 1.4C9.8 20.2 3.8 14.2 2.9 6.3c-.1-.9.5-1.7 1.4-1.9l3-.6Z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  )
}

export default function EmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<EmployeeForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) => {
        const matchesRole = roleFilter === 'all' || employee.role === roleFilter
        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'active' ? employee.isActive : !employee.isActive)
        return matchesRole && matchesStatus
      }),
    [employees, roleFilter, statusFilter],
  )

  const activeCount = employees.filter((employee) => employee.isActive).length
  const inactiveCount = employees.length - activeCount
  const averageSalary = employees.length
    ? Math.round(
        employees.reduce((total, employee) => total + employee.baseSalary, 0) /
          employees.length,
      )
    : 0

  async function load(targetPage = page, search = keyword) {
    setLoading(true)
    setError('')
    try {
      const result = await getEmployees(search, targetPage, 10)
      setEmployees(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(result.totalPages || 1, 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được danh sách nhân viên.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(1, '')
  }, [])

  useEffect(() => {
    if (!modalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => firstFieldRef.current?.focus())
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setModalOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [modalOpen, saving])

  function openCreate() {
    setForm({ ...emptyForm, hireDate: new Date().toISOString().slice(0, 10) })
    setError('')
    setMessage('')
    setModalOpen(true)
  }

  function openEdit(employee: Employee) {
    setForm({
      id: employee.id,
      employeeCode: employee.employeeCode,
      ho: employee.ho ?? '',
      ten: employee.ten,
      email: employee.email ?? '',
      phoneNumber: employee.phoneNumber,
      password: '',
      role: employee.role ?? 'Staff',
      dateOfBirth: employee.dateOfBirth?.slice(0, 10) ?? '',
      address: employee.address ?? '',
      position: employee.position,
      baseSalary: employee.baseSalary,
      hireDate: employee.hireDate.slice(0, 10),
      isActive: employee.isActive,
    })
    setError('')
    setMessage('')
    setModalOpen(true)
  }

  async function submitEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = form.id
        ? await updateEmployee(form)
        : await createEmployee(form)
      setMessage(
        result.message ??
          (form.id ? 'Cập nhật thành công.' : 'Tạo nhân viên thành công.'),
      )
      setModalOpen(false)
      await load(form.id ? page : 1, keyword)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không lưu được nhân viên.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function removeEmployee(employee: Employee) {
    if (
      !(await confirmAction(
        `Ngừng hoạt động nhân viên ${employee.ho ?? ''} ${employee.ten}?`,
      ))
    )
      return

    setError('')
    setMessage('')
    try {
      const result = await deactivateEmployee(employee.id)
      setMessage(result.message ?? 'Đã ngừng hoạt động nhân viên.')
      await load(page, keyword)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không thể ngừng hoạt động.',
      )
    }
  }

  return (
    <section className="employees-page" aria-labelledby="employees-page-title">
      <header className="employee-command-bar">
        <div className="employee-breadcrumb">
          <span>Hệ thống</span>
          <ChevronIcon />
          <h2 id="employees-page-title">Nhân viên</h2>
        </div>
        <button
          type="button"
          className="primary-button employee-add-button"
          aria-label="+ Thêm nhân viên"
          onClick={openCreate}
        >
          <PlusIcon />
          <span>Thêm nhân viên</span>
        </button>
      </header>

      <div className="employee-summary" aria-label="Tổng quan nhân sự">
        <article className="employee-stat total">
          <span>Tổng nhân sự</span>
          <div>
            <strong>{totalCount}</strong>
            <small>thành viên</small>
          </div>
        </article>
        <article className="employee-stat active">
          <span>Đang làm việc</span>
          <div>
            <strong>{activeCount}</strong>
            <small>người trong trang</small>
          </div>
        </article>
        <article className="employee-stat inactive">
          <span>Ngừng hoạt động</span>
          <div>
            <strong>{inactiveCount}</strong>
            <small>người trong trang</small>
          </div>
        </article>
        <article className="employee-stat salary">
          <span>Mức lương trung bình</span>
          <div>
            <strong>{formatMoney(averageSalary)}</strong>
          </div>
        </article>
      </div>

      <div className="employee-filter-panel">
        <label>
          <span>Chức vụ / Vai trò:</span>
          <select
            aria-label="Lọc theo vai trò"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="all">Tất cả chức vụ</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Trạng thái làm việc:</span>
          <select
            aria-label="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang làm việc</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
        </label>
      </div>

      <form
        className="employee-search-row"
        onSubmit={(event) => {
          event.preventDefault()
          void load(1, keyword)
        }}
      >
        <div className="employee-search-box">
          <SearchIcon />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm mã, tên, email, số điện thoại, vị trí..."
          />
          {keyword && (
            <button
              type="button"
              className="employee-clear-search"
              aria-label="Xóa lọc"
              onClick={() => {
                setKeyword('')
                void load(1, '')
              }}
            >
              ×
            </button>
          )}
          <button type="submit" className="employee-search-submit" aria-label="Tìm kiếm">
            Tìm kiếm
          </button>
        </div>
        <span className="employee-result-count">
          Tìm thấy{' '}
          <strong>
            {roleFilter === 'all' && statusFilter === 'all'
              ? totalCount
              : filteredEmployees.length}
          </strong>{' '}
          bản ghi
        </span>
      </form>

      {message && <div className="inline-alert success">{message}</div>}
      {!modalOpen && error && <div className="inline-alert error">{error}</div>}

      <div className="employee-table-panel">
        <div className="table-scroll">
          <table aria-label="Danh sách nhân viên">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và tên</th>
                <th>Liên hệ</th>
                <th>Lương &amp; ngày vào</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <span className="employee-loading-spinner" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Chưa có nhân viên phù hợp.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="employee-code">{employee.employeeCode}</td>
                    <td>
                      <div className="employee-identity">
                        <strong>
                          {[employee.ho, employee.ten].filter(Boolean).join(' ')}
                        </strong>
                        <small>
                          <BriefcaseIcon />
                          {employee.position || 'Chưa cập nhật vị trí'}
                          {employee.role ? ` · ${roleLabels[employee.role] ?? employee.role}` : ''}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="employee-contact">
                        <span>
                          <PhoneIcon />
                          {employee.phoneNumber}
                        </span>
                        <small>
                          <MailIcon />
                          {employee.email || 'Chưa có email'}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="employee-payroll">
                        <strong>{formatMoney(employee.baseSalary)}</strong>
                        <small>
                          <CalendarIcon />
                          vào làm {formatDate(employee.hireDate)}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${employee.isActive ? 'active' : 'inactive'}`}
                      >
                        {employee.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions employee-row-actions">
                        <button
                          type="button"
                          aria-label="Sửa"
                          title="Sửa nhân viên"
                          onClick={() => openEdit(employee)}
                        >
                          <EditIcon />
                        </button>
                        {employee.isActive && (
                          <button
                            type="button"
                            className="danger"
                            aria-label="Ngừng"
                            title="Ngừng hoạt động"
                            onClick={() => void removeEmployee(employee)}
                          >
                            <PauseIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <span>
            Trang <strong>{page}</strong>/{totalPages}
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => void load(page - 1, keyword)}
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => void load(page + 1, keyword)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div
          className="modal-backdrop employee-modal-backdrop"
          onMouseDown={() => !saving && setModalOpen(false)}
        >
          <div
            className="employee-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2
                  id="employee-modal-title"
                  aria-label={form.id ? 'Cập nhật nhân viên' : 'Thêm nhân viên'}
                >
                  {form.id
                    ? 'Cập nhật hồ sơ nhân viên'
                    : 'Thêm hồ sơ nhân viên mới'}
                </h2>
                <p>Thông tin hồ sơ, công việc và tài khoản đăng nhập.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                disabled={saving}
                onClick={() => setModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitEmployee} className="employee-form">
              <div className="employee-form-fields">
                {error && <div className="employee-form-alert">{error}</div>}

                <label>
                  <span>
                    Mã nhân viên <b aria-hidden="true">*</b>
                  </span>
                  <input
                    ref={firstFieldRef}
                    aria-label="Mã nhân viên"
                    required
                    placeholder="Ví dụ: EMP-607"
                    value={form.employeeCode}
                    onChange={(event) =>
                      setForm({ ...form, employeeCode: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Họ</span>
                  <input
                    aria-label="Họ"
                    placeholder="Ví dụ: Nguyễn Văn"
                    value={form.ho}
                    onChange={(event) => setForm({ ...form, ho: event.target.value })}
                  />
                </label>
                <label>
                  <span>
                    Tên <b aria-hidden="true">*</b>
                  </span>
                  <input
                    aria-label="Tên"
                    required
                    placeholder="Ví dụ: An"
                    value={form.ten}
                    onChange={(event) => setForm({ ...form, ten: event.target.value })}
                  />
                </label>
                <label>
                  <span>
                    Email <b aria-hidden="true">*</b>
                  </span>
                  <input
                    type="email"
                    aria-label="Email"
                    required
                    placeholder="an.nguyen@restaurant.com"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </label>
                <label>
                  <span>
                    Số điện thoại <b aria-hidden="true">*</b>
                  </span>
                  <input
                    aria-label="Số điện thoại"
                    required
                    placeholder="0908 123 456"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      setForm({ ...form, phoneNumber: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>
                    Mật khẩu {!form.id && <b aria-hidden="true">*</b>}
                  </span>
                  <input
                    type="password"
                    aria-label="Mật khẩu"
                    required={!form.id}
                    placeholder={form.id ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'}
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Vai trò</span>
                  <select
                    aria-label="Vai trò"
                    value={form.role}
                    onChange={(event) => setForm({ ...form, role: event.target.value })}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>
                    Vị trí công việc <b aria-hidden="true">*</b>
                  </span>
                  <input
                    aria-label="Vị trí công việc"
                    required
                    placeholder="Ví dụ: Phục vụ bàn"
                    value={form.position}
                    onChange={(event) =>
                      setForm({ ...form, position: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>
                    Lương cơ bản <b aria-hidden="true">*</b>
                  </span>
                  <input
                    type="number"
                    aria-label="Lương cơ bản"
                    min="0"
                    required
                    value={form.baseSalary}
                    onChange={(event) =>
                      setForm({ ...form, baseSalary: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  <span>
                    Ngày vào làm <b aria-hidden="true">*</b>
                  </span>
                  <input
                    type="date"
                    aria-label="Ngày vào làm"
                    required
                    value={form.hireDate}
                    onChange={(event) =>
                      setForm({ ...form, hireDate: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Ngày sinh</span>
                  <input
                    type="date"
                    aria-label="Ngày sinh"
                    value={form.dateOfBirth}
                    onChange={(event) =>
                      setForm({ ...form, dateOfBirth: event.target.value })
                    }
                  />
                </label>
                <label className="employee-address-field">
                  <span>Địa chỉ</span>
                  <input
                    aria-label="Địa chỉ"
                    placeholder="Nhập địa chỉ tạm trú hoặc thường trú"
                    value={form.address}
                    onChange={(event) =>
                      setForm({ ...form, address: event.target.value })
                    }
                  />
                </label>

                <fieldset className="employee-status-field">
                  <legend>Trạng thái nhân sự</legend>
                  <div>
                    <button
                      type="button"
                      className={form.isActive ? 'active' : ''}
                      onClick={() => setForm({ ...form, isActive: true })}
                    >
                      Hoạt động
                    </button>
                    <button
                      type="button"
                      className={!form.isActive ? 'inactive active' : ''}
                      disabled={!form.id}
                      title={!form.id ? 'Nhân viên mới luôn bắt đầu ở trạng thái hoạt động' : undefined}
                      onClick={() => setForm({ ...form, isActive: false })}
                    >
                      Ngừng hoạt động
                    </button>
                  </div>
                  {!form.id && (
                    <small>Nhân viên mới được khởi tạo ở trạng thái hoạt động.</small>
                  )}
                </fieldset>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="employee-cancel-button"
                  disabled={saving}
                  onClick={() => setModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="primary-button employee-save-button"
                  aria-label="Lưu nhân viên"
                  disabled={saving}
                >
                  {saving
                    ? 'Đang lưu...'
                    : form.id
                      ? 'Lưu thay đổi'
                      : 'Thêm nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
