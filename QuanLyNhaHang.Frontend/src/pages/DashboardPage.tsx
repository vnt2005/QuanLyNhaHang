import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  getDashboard,
  type DashboardData,
} from '../services/dashboard'

type DashboardPageProps = {
  name: string
  onNavigate: (item: string) => void
}

type DateFilters = {
  fromDate: string
  toDate: string
  top: number
}

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

const compactMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

const number = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits }).format(value)

function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getInitialFilters(): DateFilters {
  const toDate = new Date()
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 6)
  return {
    fromDate: toInputDate(fromDate),
    toDate: toInputDate(toDate),
    top: 5,
  }
}

function getErrorMessage(exception: unknown) {
  return exception instanceof Error
    ? exception.message
    : 'Đã xảy ra lỗi không xác định.'
}

function formatRefreshTime(value: Date | null) {
  if (!value) return 'Chưa cập nhật'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

function LoadingDashboard() {
  return (
    <section className="live-dashboard-loading" aria-live="polite">
      <span className="live-dashboard-spinner"/>
      <strong>Đang tổng hợp dữ liệu vận hành…</strong>
      <small>Doanh thu, đơn hàng và bàn đang được đồng bộ.</small>
    </section>
  )
}

function EmptyList({ message }: { message: string }) {
  return (
    <div className="live-dashboard-empty">
      <span>✓</span>
      <strong>{message}</strong>
    </div>
  )
}

export default function DashboardPage({
  name,
  onNavigate,
}: DashboardPageProps) {
  const initialFilters = useMemo(getInitialFilters, [])
  const [draftFilters, setDraftFilters] = useState(initialFilters)
  const [filters, setFilters] = useState(initialFilters)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterError, setFilterError] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [refreshVersion, setRefreshVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    getDashboard({ ...filters, signal: controller.signal })
      .then(result => {
        setData(result)
        setLastUpdatedAt(new Date())
      })
      .catch(exception => {
        if (exception instanceof DOMException && exception.name === 'AbortError') {
          return
        }
        setError(getErrorMessage(exception))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [filters, refreshVersion])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshVersion(current => current + 1)
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draftFilters.fromDate || !draftFilters.toDate) {
      setFilterError('Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.')
      return
    }
    if (draftFilters.fromDate > draftFilters.toDate) {
      setFilterError('Ngày bắt đầu không thể sau ngày kết thúc.')
      return
    }
    const fromDate = new Date(`${draftFilters.fromDate}T00:00:00`)
    const toDate = new Date(`${draftFilters.toDate}T00:00:00`)
    const totalDays = Math.floor(
      (toDate.getTime() - fromDate.getTime()) / 86_400_000,
    ) + 1
    if (totalDays > 90) {
      setFilterError('Dashboard hỗ trợ khoảng thời gian tối đa 90 ngày.')
      return
    }
    setFilterError('')
    setFilters(draftFilters)
  }

  const overview = data?.overview
  const activeOrders = overview
    ? overview.pendingOrders + overview.cookingOrders + overview.servedOrders
    : 0
  const totalTables = overview
    ? overview.availableTables
      + overview.occupiedTables
      + overview.reservedTables
      + overview.cleaningTables
    : 0
  const busyTables = overview
    ? overview.occupiedTables + overview.reservedTables
    : 0
  const pendingKitchenItems = overview
    ? overview.pendingKitchenItems
      + overview.cookingKitchenItems
      + overview.readyKitchenItems
    : 0
  const chartMax = Math.max(
    1,
    ...(data?.revenueChart.map(point => point.revenue) ?? [0]),
  )
  const selectedRevenue = data?.revenueChart.reduce(
    (total, point) => total + point.revenue,
    0,
  ) ?? 0
  const selectedOrders = data?.revenueChart.reduce(
    (total, point) => total + point.orderCount,
    0,
  ) ?? 0
  const selectedInvoices = data?.revenueChart.reduce(
    (total, point) => total + point.invoiceCount,
    0,
  ) ?? 0
  const todayLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <section className="live-dashboard-page">
      <article className="live-dashboard-welcome">
        <div>
          <span>{todayLabel}</span>
          <h2>Chào mừng trở lại, {name}!</h2>
          <p>
            Theo dõi dữ liệu vận hành thực tế và xử lý nhanh các việc cần ưu tiên.
          </p>
        </div>
        <button type="button" onClick={() => onNavigate('Đơn hàng')}>
          <span>＋</span> Tạo đơn hàng
        </button>
      </article>

      <div className="live-dashboard-control-row">
        <form onSubmit={applyFilters}>
          <label>
            Từ ngày
            <input
              type="date"
              value={draftFilters.fromDate}
              onChange={event => setDraftFilters(current => ({
                ...current,
                fromDate: event.target.value,
              }))}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="date"
              value={draftFilters.toDate}
              onChange={event => setDraftFilters(current => ({
                ...current,
                toDate: event.target.value,
              }))}
            />
          </label>
          <label>
            Số mục nổi bật
            <select
              value={draftFilters.top}
              onChange={event => setDraftFilters(current => ({
                ...current,
                top: Number(event.target.value),
              }))}
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
            </select>
          </label>
          <button type="submit" disabled={loading}>Áp dụng</button>
        </form>
        <div className="live-dashboard-sync">
          <span className={error ? 'error' : ''}/>
          <div>
            <strong>{error ? 'Đồng bộ gián đoạn' : 'Tự động cập nhật mỗi 60 giây'}</strong>
            <small>Cập nhật lần cuối: {formatRefreshTime(lastUpdatedAt)}</small>
          </div>
          <button
            type="button"
            onClick={() => setRefreshVersion(current => current + 1)}
            disabled={loading}
            aria-label="Làm mới dữ liệu"
            title="Làm mới dữ liệu"
          >
            {loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      {filterError && (
        <div className="live-dashboard-alert warning">{filterError}</div>
      )}
      {error && (
        <div className="live-dashboard-alert error">
          <div>
            <strong>Không thể tải dữ liệu mới</strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setRefreshVersion(current => current + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {!data && loading
        ? <LoadingDashboard/>
        : <>
          <section className="live-dashboard-kpis">
            <article className="revenue">
              <span className="live-dashboard-kpi-icon">₫</span>
              <p>Doanh thu hôm nay</p>
              <h3>{money(overview?.todayRevenue ?? 0)}</h3>
              <small>
                {number(overview?.todayPayments ?? 0)} thanh toán ·{' '}
                {number(overview?.todayInvoices ?? 0)} hóa đơn
              </small>
            </article>
            <article className="orders">
              <span className="live-dashboard-kpi-icon">▣</span>
              <p>Đơn đang phục vụ</p>
              <h3>{number(activeOrders)}</h3>
              <small>
                {number(overview?.pendingOrders ?? 0)} chờ ·{' '}
                {number(overview?.cookingOrders ?? 0)} đang nấu ·{' '}
                {number(overview?.servedOrders ?? 0)} đã phục vụ
              </small>
            </article>
            <article className="tables">
              <span className="live-dashboard-kpi-icon">▦</span>
              <p>Bàn đang sử dụng</p>
              <h3>{number(busyTables)} / {number(totalTables)}</h3>
              <small>
                {totalTables
                  ? `${number((busyTables / totalTables) * 100, 1)}% công suất`
                  : 'Chưa có dữ liệu bàn'}
              </small>
            </article>
            <article className="kitchen">
              <span className="live-dashboard-kpi-icon">♨</span>
              <p>Món cần bếp xử lý</p>
              <h3>{number(pendingKitchenItems)}</h3>
              <small>
                {number(overview?.pendingKitchenItems ?? 0)} chờ ·{' '}
                {number(overview?.readyKitchenItems ?? 0)} sẵn sàng
              </small>
            </article>
          </section>

          <section className="live-dashboard-main-grid">
            <article className="live-dashboard-card live-dashboard-chart-card">
              <header>
                <div>
                  <span>HIỆU SUẤT KINH DOANH</span>
                  <h3>Doanh thu theo ngày</h3>
                  <p>
                    {number(selectedOrders)} đơn · {number(selectedInvoices)} hóa đơn
                    trong khoảng đã chọn
                  </p>
                </div>
                <strong>{money(selectedRevenue)}</strong>
              </header>
              {data?.revenueChart.length
                ? <div className="live-dashboard-chart">
                  <div className="live-dashboard-y-axis">
                    <span>{compactMoney(chartMax)}</span>
                    <span>{compactMoney(chartMax / 2)}</span>
                    <span>0 ₫</span>
                  </div>
                  <div
                    className="live-dashboard-bars"
                    style={{
                      minWidth: `${Math.max(
                        420,
                        data.revenueChart.length * 48,
                      )}px`,
                    }}
                  >
                    {data.revenueChart.map(point => {
                      const height = point.revenue
                        ? Math.max(5, (point.revenue / chartMax) * 100)
                        : 2
                      return (
                        <div
                          className="live-dashboard-bar-column"
                          key={point.date || point.dateText}
                          title={`${point.dateText}: ${money(point.revenue)} · ${point.orderCount} đơn`}
                        >
                          <div className="live-dashboard-bar-track">
                            <span
                              className={point.revenue ? '' : 'empty'}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <strong>{point.dateText}</strong>
                          <small>{point.orderCount} đơn</small>
                        </div>
                      )
                    })}
                  </div>
                </div>
                : <EmptyList message="Chưa có doanh thu trong khoảng đã chọn"/>
              }
            </article>

            <article className="live-dashboard-card live-dashboard-orders-card">
              <header>
                <div>
                  <span>LUỒNG ĐƠN HÀNG</span>
                  <h3>Trạng thái hiện tại</h3>
                </div>
                <button type="button" onClick={() => onNavigate('Đơn hàng')}>
                  Mở đơn hàng →
                </button>
              </header>
              <div className="live-dashboard-status-list">
                {[
                  ['Chờ xác nhận', overview?.pendingOrders ?? 0, 'pending'],
                  ['Đang chế biến', overview?.cookingOrders ?? 0, 'cooking'],
                  ['Đã phục vụ', overview?.servedOrders ?? 0, 'served'],
                  ['Hoàn tất', overview?.completedOrders ?? 0, 'completed'],
                  ['Đã hủy', overview?.cancelledOrders ?? 0, 'cancelled'],
                ].map(([label, value, status]) => (
                  <div key={label}>
                    <span className={`status-dot ${status}`}/>
                    <strong>{label}</strong>
                    <b>{number(value as number)}</b>
                  </div>
                ))}
              </div>
              <div className="live-dashboard-today-summary">
                <span>Đơn tạo hôm nay</span>
                <strong>{number(overview?.todayOrders ?? 0)}</strong>
              </div>
            </article>
          </section>

          <section className="live-dashboard-secondary-grid">
            <article className="live-dashboard-card live-dashboard-list-card">
              <header>
                <div>
                  <span>THỰC ĐƠN</span>
                  <h3>Món bán chạy</h3>
                  <p>Xếp theo số lượng trong khoảng đã chọn</p>
                </div>
                <button type="button" onClick={() => onNavigate('Thực đơn')}>
                  Xem thực đơn →
                </button>
              </header>
              {data?.topSellingItems.length
                ? <div className="live-dashboard-ranking">
                  {data.topSellingItems.map((item, index) => (
                    <div key={item.menuItemId || `${item.menuItemName}-${index}`}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{item.menuItemName || 'Món chưa đặt tên'}</strong>
                        <small>{number(item.quantitySold)} phần đã bán</small>
                      </div>
                      <b>{money(item.totalRevenue)}</b>
                    </div>
                  ))}
                </div>
                : <EmptyList message="Chưa có món bán trong khoảng đã chọn"/>
              }
            </article>
          </section>

          <section className="live-dashboard-operations">
            <article>
              <div className="live-dashboard-operation-icon tables">▦</div>
              <header>
                <span>BÀN</span>
                <button type="button" onClick={() => onNavigate('Khu vực & bàn')}>Chi tiết →</button>
              </header>
              <h3>{number(overview?.availableTables ?? 0)} bàn trống</h3>
              <div>
                <span><i className="occupied"/>{number(overview?.occupiedTables ?? 0)} đang dùng</span>
                <span><i className="reserved"/>{number(overview?.reservedTables ?? 0)} đã đặt</span>
                <span><i className="cleaning"/>{number(overview?.cleaningTables ?? 0)} đang dọn</span>
              </div>
            </article>
            <article>
              <div className="live-dashboard-operation-icon reservations">◫</div>
              <header>
                <span>ĐẶT BÀN</span>
                <button type="button" onClick={() => onNavigate('Đặt bàn')}>Chi tiết →</button>
              </header>
              <h3>{number(overview?.todayReservations ?? 0)} lịch hôm nay</h3>
              <div>
                <span><i className="pending"/>{number(overview?.pendingReservations ?? 0)} chờ xác nhận</span>
                <span><i className="confirmed"/>{number(overview?.confirmedReservations ?? 0)} đã xác nhận</span>
              </div>
            </article>
            <article>
              <div className="live-dashboard-operation-icon finance">₫</div>
              <header>
                <span>TÀI CHÍNH HÔM NAY</span>
                <button type="button" onClick={() => onNavigate('Thanh toán')}>Chi tiết →</button>
              </header>
              <h3>{number(overview?.todayPayments ?? 0)} giao dịch</h3>
              <div>
                <span><i className="discount"/>Giảm {money(overview?.todayDiscountAmount ?? 0)}</span>
                <span><i className="vat"/>VAT {money(overview?.todayVatAmount ?? 0)}</span>
              </div>
            </article>
            <article>
              <div className="live-dashboard-operation-icon system">◴</div>
              <header>
                <span>HỆ THỐNG HÔM NAY</span>
                <button type="button" onClick={() => onNavigate('Nhật ký hoạt động')}>Chi tiết →</button>
              </header>
              <h3>{number(overview?.todayActivityLogs ?? 0)} hoạt động</h3>
              <div>
                <span><i className="success"/>{number(
                  Math.max(
                    0,
                    (overview?.todayActivityLogs ?? 0)
                      - (overview?.todayFailedActivityLogs ?? 0),
                  ),
                )} thành công</span>
                <span><i className="failed"/>{number(overview?.todayFailedActivityLogs ?? 0)} thất bại</span>
              </div>
            </article>
          </section>
        </>
      }
    </section>
  )
}
