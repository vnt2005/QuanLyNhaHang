import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getUsers,
  updateUser,
  type UserAccount,
  type UserFilters,
} from '../api/access'
import {
  getReservations,
  type Reservation,
  type ReservationStatus,
} from '../api/reservations'

type CustomerFilter = 'all' | 'active' | 'locked' | 'unverified'

type CustomerForm = {
  id: string
  ho: string
  ten: string
  email: string
  phoneNumber: string
  isActive: boolean
}

const pageSize = 12

const reservationLabels: Record<ReservationStatus, string> = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  CheckedIn: 'Đã nhận bàn',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
  NoShow: 'Không đến',
}

function getErrorMessage(exception: unknown, fallback: string) {
  return exception instanceof Error ? exception.message : fallback
}

function getCustomerName(customer: UserAccount) {
  return [customer.ho, customer.ten].filter(Boolean).join(' ')
    || customer.email
}

function getInitial(customer: UserAccount) {
  return (customer.ten || customer.email || '?')
    .charAt(0)
    .toLocaleUpperCase('vi')
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime
      ? { hour: '2-digit', minute: '2-digit' }
      : {}),
  }).format(date)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

function matchesCustomer(
  reservation: Reservation,
  customer: UserAccount,
) {
  const customerPhone = normalizePhone(customer.phoneNumber)
  const reservationPhone = normalizePhone(reservation.phoneNumber)
  const customerEmail = customer.email.trim().toLocaleLowerCase()
  const reservationEmail = reservation.email?.trim().toLocaleLowerCase() ?? ''

  return Boolean(
    (customerPhone && reservationPhone === customerPhone)
    || (customerEmail && reservationEmail === customerEmail),
  )
}

function filtersFor(status: CustomerFilter): UserFilters {
  const filters: UserFilters = { role: 'Customer' }
  if (status === 'active') filters.isActive = true
  if (status === 'locked') filters.isActive = false
  if (status === 'unverified') filters.isEmailVerified = false
  return filters
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<UserAccount[]>([])
  const [keyword, setKeyword] = useState('')
  const [filter, setFilter] = useState<CustomerFilter>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    verified: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] =
    useState<UserAccount | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [reservationLoading, setReservationLoading] = useState(false)
  const [reservationError, setReservationError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [customerForm, setCustomerForm] = useState<CustomerForm | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadCustomers(
    targetPage = page,
    search = keyword,
    targetFilter = filter,
  ) {
    setLoading(true)
    setError('')
    try {
      const [result, allCustomers, activeCustomers, verifiedCustomers] =
        await Promise.all([
          getUsers(
            search,
            targetPage,
            pageSize,
            filtersFor(targetFilter),
          ),
          getUsers('', 1, 1, { role: 'Customer' }),
          getUsers('', 1, 1, { role: 'Customer', isActive: true }),
          getUsers('', 1, 1, {
            role: 'Customer',
            isEmailVerified: true,
          }),
        ])

      setCustomers(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(result.totalPages || 1, 1))
      setSummary({
        total: allCustomers.totalCount || 0,
        active: activeCustomers.totalCount || 0,
        verified: verifiedCustomers.totalCount || 0,
      })
    } catch (exception) {
      setError(getErrorMessage(
        exception,
        'Không tải được danh sách khách hàng.',
      ))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCustomers(1, '', 'all')
  }, [])

  async function openDetails(customer: UserAccount) {
    setSelectedCustomer(customer)
    setReservations([])
    setReservationError('')
    setDetailOpen(true)
    setReservationLoading(true)

    try {
      const search = customer.phoneNumber.trim() || customer.email.trim()
      const result = await getReservations(
        search,
        '',
        '',
        '',
        1,
        50,
      )
      setReservations(
        (result.items ?? []).filter(item => matchesCustomer(item, customer)),
      )
    } catch (exception) {
      setReservationError(getErrorMessage(
        exception,
        'Không tải được lịch sử đặt bàn của khách hàng.',
      ))
    } finally {
      setReservationLoading(false)
    }
  }

  function openEdit(customer: UserAccount) {
    setCustomerForm({
      id: customer.id,
      ho: customer.ho ?? '',
      ten: customer.ten,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      isActive: customer.isActive,
    })
    setDetailOpen(false)
    setEditOpen(true)
    setError('')
    setMessage('')
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!customerForm) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await updateUser({
        id: customerForm.id,
        ho: customerForm.ho.trim(),
        ten: customerForm.ten.trim(),
        email: customerForm.email.trim(),
        phoneNumber: customerForm.phoneNumber.trim(),
        role: 'Customer',
        isActive: customerForm.isActive,
      })
      setMessage(result.message ?? 'Cập nhật khách hàng thành công.')
      setEditOpen(false)
      await loadCustomers(page, keyword, filter)
    } catch (exception) {
      setError(getErrorMessage(
        exception,
        'Không cập nhật được khách hàng.',
      ))
    } finally {
      setSaving(false)
    }
  }

  const reservationSummary = useMemo(() => {
    const completed = reservations.filter(
      item => item.status === 'Completed',
    ).length
    const upcoming = reservations.filter(
      item => item.status === 'Pending' || item.status === 'Confirmed',
    ).length
    const deposits = reservations
      .filter(item => item.status !== 'Cancelled')
      .reduce((total, item) => total + item.depositAmount, 0)
    return { completed, upcoming, deposits }
  }, [reservations])

  const unverifiedCount = Math.max(summary.total - summary.verified, 0)

  return (
    <section className="customers-page">
      <div className="customers-heading">
        <div>
          <span>CRM NHÀ HÀNG</span>
          <h2>Quản lý khách hàng</h2>
          <p>
            Theo dõi tài khoản khách, trạng thái xác minh và lịch sử đặt bàn.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCustomers(page, keyword, filter)}
          disabled={loading}
        >
          {loading ? 'Đang đồng bộ…' : '↻ Làm mới'}
        </button>
      </div>

      <div className="customer-kpis">
        <article>
          <span className="customer-kpi-icon total">♙</span>
          <div>
            <small>TỔNG KHÁCH HÀNG</small>
            <strong>{summary.total}</strong>
            <p>Tài khoản có vai trò Customer</p>
          </div>
        </article>
        <article>
          <span className="customer-kpi-icon active">✓</span>
          <div>
            <small>ĐANG HOẠT ĐỘNG</small>
            <strong>{summary.active}</strong>
            <p>Có thể đăng nhập và sử dụng dịch vụ</p>
          </div>
        </article>
        <article>
          <span className="customer-kpi-icon verified">@</span>
          <div>
            <small>ĐÃ XÁC MINH EMAIL</small>
            <strong>{summary.verified}</strong>
            <p>Tài khoản đã hoàn tất xác minh</p>
          </div>
        </article>
        <article>
          <span className="customer-kpi-icon warning">!</span>
          <div>
            <small>CHỜ XÁC MINH</small>
            <strong>{unverifiedCount}</strong>
            <p>Cần xác minh email để đăng nhập</p>
          </div>
        </article>
      </div>

      {message && <div className="customer-alert success">{message}</div>}
      {error && <div className="customer-alert error">{error}</div>}

      <div className="customer-table-card">
        <form
          className="customer-toolbar"
          onSubmit={event => {
            event.preventDefault()
            void loadCustomers(1, keyword, filter)
          }}
        >
          <div className="customer-search">
            <span>⌕</span>
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
            />
          </div>
          <select
            value={filter}
            onChange={event => {
              const next = event.target.value as CustomerFilter
              setFilter(next)
              void loadCustomers(1, keyword, next)
            }}
          >
            <option value="all">Tất cả khách hàng</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khóa</option>
            <option value="unverified">Chưa xác minh email</option>
          </select>
          <button type="submit">Tìm kiếm</button>
          {(keyword || filter !== 'all') && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setKeyword('')
                setFilter('all')
                void loadCustomers(1, '', 'all')
              }}
            >
              Xóa lọc
            </button>
          )}
        </form>

        <div className="customer-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Liên hệ</th>
                <th>Ngày đăng ký</th>
                <th>Xác minh email</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="customer-empty">
                    Đang tải dữ liệu khách hàng…
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="customer-empty">
                    Không có khách hàng phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : customers.map(customer => (
                <tr key={customer.id}>
                  <td>
                    <div className="customer-identity">
                      <span>{getInitial(customer)}</span>
                      <div>
                        <strong>{getCustomerName(customer)}</strong>
                        <small>Mã {customer.id.slice(0, 8)}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="customer-contact">
                      <strong>{customer.email}</strong>
                      <small>{customer.phoneNumber || 'Chưa có SĐT'}</small>
                    </div>
                  </td>
                  <td>{formatDate(customer.createdAt)}</td>
                  <td>
                    <span className={`customer-badge ${
                      customer.isEmailVerified ? 'verified' : 'unverified'
                    }`}>
                      {customer.isEmailVerified
                        ? 'Đã xác minh'
                        : 'Chưa xác minh'}
                    </span>
                  </td>
                  <td>
                    <span className={`customer-badge ${
                      customer.isActive ? 'active' : 'locked'
                    }`}>
                      {customer.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <div className="customer-actions">
                      <button
                        type="button"
                        onClick={() => void openDetails(customer)}
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(customer)}
                      >
                        Sửa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="customer-pagination">
          <span>Trang {page}/{totalPages}</span>
          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void loadCustomers(page - 1, keyword, filter)}
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void loadCustomers(page + 1, keyword, filter)}
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {detailOpen && selectedCustomer && (
        <div
          className="customer-modal-backdrop"
          onMouseDown={() => setDetailOpen(false)}
        >
          <div
            className="customer-detail-modal"
            onMouseDown={event => event.stopPropagation()}
          >
            <header>
              <div className="customer-detail-profile">
                <span>{getInitial(selectedCustomer)}</span>
                <div>
                  <small>HỒ SƠ KHÁCH HÀNG</small>
                  <h2>{getCustomerName(selectedCustomer)}</h2>
                  <p>{selectedCustomer.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setDetailOpen(false)}>
                ×
              </button>
            </header>

            <div className="customer-detail-grid">
              <article>
                <small>SỐ ĐIỆN THOẠI</small>
                <strong>{selectedCustomer.phoneNumber || 'Chưa cập nhật'}</strong>
              </article>
              <article>
                <small>NGÀY ĐĂNG KÝ</small>
                <strong>{formatDate(selectedCustomer.createdAt)}</strong>
              </article>
              <article>
                <small>EMAIL</small>
                <strong>
                  {selectedCustomer.isEmailVerified
                    ? 'Đã xác minh'
                    : 'Chưa xác minh'}
                </strong>
              </article>
              <article>
                <small>TÀI KHOẢN</small>
                <strong>
                  {selectedCustomer.isActive ? 'Đang hoạt động' : 'Đã khóa'}
                </strong>
              </article>
            </div>

            <div className="customer-reservation-summary">
              <article>
                <span>{reservations.length}</span>
                <small>Tổng lượt đặt bàn</small>
              </article>
              <article>
                <span>{reservationSummary.completed}</span>
                <small>Đã hoàn thành</small>
              </article>
              <article>
                <span>{reservationSummary.upcoming}</span>
                <small>Sắp tới</small>
              </article>
              <article>
                <span>{formatCurrency(reservationSummary.deposits)}</span>
                <small>Tổng tiền cọc</small>
              </article>
            </div>

            <section className="customer-reservations">
              <div>
                <h3>Lịch sử đặt bàn</h3>
                <p>Đối chiếu theo email hoặc số điện thoại của tài khoản.</p>
              </div>

              {reservationError && (
                <div className="customer-alert error">{reservationError}</div>
              )}

              {reservationLoading ? (
                <div className="customer-reservation-empty">
                  Đang tải lịch sử đặt bàn…
                </div>
              ) : reservations.length === 0 ? (
                <div className="customer-reservation-empty">
                  Chưa tìm thấy lượt đặt bàn gắn với khách hàng này.
                </div>
              ) : (
                <div className="customer-reservation-list">
                  {reservations.map(reservation => (
                    <article key={reservation.id}>
                      <div>
                        <strong>{reservation.reservationCode}</strong>
                        <small>
                          {formatDate(reservation.reservationTime, true)}
                          {' · '}
                          {reservation.restaurantTableName}
                        </small>
                      </div>
                      <span className={`reservation-state ${reservation.status}`}>
                        {reservationLabels[reservation.status]}
                      </span>
                      <div>
                        <strong>{reservation.numberOfGuests} khách</strong>
                        <small>
                          Cọc {formatCurrency(reservation.depositAmount)}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <footer>
              <button type="button" onClick={() => setDetailOpen(false)}>
                Đóng
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => openEdit(selectedCustomer)}
              >
                Cập nhật khách hàng
              </button>
            </footer>
          </div>
        </div>
      )}

      {editOpen && customerForm && (
        <div
          className="customer-modal-backdrop"
          onMouseDown={() => !saving && setEditOpen(false)}
        >
          <div
            className="customer-edit-modal"
            onMouseDown={event => event.stopPropagation()}
          >
            <header>
              <div>
                <small>CHỈNH SỬA HỒ SƠ</small>
                <h2>Cập nhật khách hàng</h2>
                <p>Vai trò Customer được giữ nguyên khi lưu thay đổi.</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={saveCustomer}>
              <label>
                Họ
                <input
                  value={customerForm.ho}
                  onChange={event => setCustomerForm({
                    ...customerForm,
                    ho: event.target.value,
                  })}
                />
              </label>
              <label>
                Tên
                <input
                  required
                  value={customerForm.ten}
                  onChange={event => setCustomerForm({
                    ...customerForm,
                    ten: event.target.value,
                  })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={customerForm.email}
                  onChange={event => setCustomerForm({
                    ...customerForm,
                    email: event.target.value,
                  })}
                />
              </label>
              <label>
                Số điện thoại
                <input
                  required
                  value={customerForm.phoneNumber}
                  onChange={event => setCustomerForm({
                    ...customerForm,
                    phoneNumber: event.target.value,
                  })}
                />
              </label>
              <label className="customer-checkbox">
                <input
                  type="checkbox"
                  checked={customerForm.isActive}
                  onChange={event => setCustomerForm({
                    ...customerForm,
                    isActive: event.target.checked,
                  })}
                />
                Cho phép tài khoản đăng nhập
              </label>
              <div className="customer-security-note">
                Thay đổi email hoặc trạng thái tài khoản sẽ thu hồi các phiên
                đăng nhập hiện tại của khách hàng.
              </div>
              <footer>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditOpen(false)}
                >
                  Hủy
                </button>
                <button className="primary" disabled={saving}>
                  {saving ? 'Đang lưu…' : 'Lưu khách hàng'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
