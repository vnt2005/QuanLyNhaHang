import { useAutoDismissMessage } from '../hooks/useAutoDismissMessage'
import { confirmAction } from '../components/ConfirmDialog'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  cancelRevenueReport,
  createRevenueReport,
  getRevenueReport,
  getRevenueReports,
  getRevenueSummary,
  updateRevenueReport,
  type RevenueReport,
  type RevenueSummary,
} from '../services/revenueReports'
import {
  ADMIN_NOTIFICATION_EVENT,
  type AdminNotification,
} from '../services/notifications'
import {
  downloadRevenueReportCsv,
  downloadRevenueReportXlsx,
} from '../utils/revenueReportExport'

const statusLabels: Record<string, string> = {
  Generated: 'Đã tạo',
  Exported: 'Đã xuất',
  Printed: 'Đã in',
  Cancelled: 'Đã hủy',
}

const paymentMethodLabels: Record<string, string> = {
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản QR/ngân hàng',
  Card: 'Thẻ',
  EWallet: 'Ví điện tử',
  Momo: 'MoMo',
  ZaloPay: 'ZaloPay',
  Other: 'Khác',
}

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

function toInputDate(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}

function getDefaultRange() {
  const today = new Date()
  return {
    fromDate: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    toDate: toInputDate(today),
  }
}

function displayDate(value: string) {
  const datePart = value.slice(0, 10)
  return new Intl.DateTimeFormat('vi-VN').format(new Date(`${datePart}T00:00:00`))
}

function displayDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ??
      character,
  )
}

type RevenuePeriod = 'today' | 'week' | 'month' | 'year' | 'custom'

type RevenueExportFormat = 'csv' | 'xlsx'

function getQuickRange(period: Exclude<RevenuePeriod, 'custom'>) {
  const today = new Date()
  let fromDate = new Date(today)

  if (period === 'week') {
    fromDate.setDate(today.getDate() - 6)
  } else if (period === 'month') {
    fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
  } else if (period === 'year') {
    fromDate = new Date(today.getFullYear(), 0, 1)
  }

  return {
    fromDate: toInputDate(fromDate),
    toDate: toInputDate(today),
  }
}

function ChevronRightIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function RefreshIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 9A7 7 0 0 1 18.8 7M17.9 15A7 7 0 0 1 5.2 17" /></svg>
}

function TrendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 5-5 4 3 7-8" /><path d="M15 6h5v5" /></svg>
}

function ReceiptIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
}

function AverageIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M4 19h16M8 9h8M8 15h8" /><path d="M12 8v8" /></svg>
}

function DiscountIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 19 14-14" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></svg>
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></svg>
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 6.5 17.5 10.5M4 20l4.2-.9L19 8.3a2.8 2.8 0 0 0-4-4L4.2 15.1 4 20Z" /></svg>
}

function DownloadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5" /><path d="M5 20h14" /></svg>
}

function PrinterIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /></svg>
}

function CancelIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6M15 9l-6 6" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
}

function ArrowLeftIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
}

function ArrowRightIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
}

export default function RevenueReportsPage() {
  const defaultRange = useMemo(getDefaultRange, [])
  const [summaryFrom, setSummaryFrom] = useState(defaultRange.fromDate)
  const [summaryTo, setSummaryTo] = useState(defaultRange.toDate)
  const [activePeriod, setActivePeriod] = useState<RevenuePeriod>('month')
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [reports, setReports] = useState<RevenueReport[]>([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [reportsLoading, setReportsLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [detail, setDetail] = useState<RevenueReport | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<RevenueReport | null>(null)
  const [formFrom, setFormFrom] = useState(defaultRange.fromDate)
  const [formTo, setFormTo] = useState(defaultRange.toDate)
  const [note, setNote] = useState('')
  const realtimeRefreshRef = useRef<() => void>(() => undefined)

  function validateRange(fromDate: string, toDate: string, required = true) {
    if (required && (!fromDate || !toDate)) {
      setError('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.')
      return false
    }
    if (fromDate && toDate && fromDate > toDate) {
      setError('Ngày bắt đầu không được lớn hơn ngày kết thúc.')
      return false
    }
    return true
  }

  async function loadSummary(fromDate = summaryFrom, toDate = summaryTo) {
    if (!validateRange(fromDate, toDate)) return
    setSummaryLoading(true)
    try {
      setSummary(await getRevenueSummary(fromDate, toDate))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được số liệu doanh thu.')
    } finally {
      setSummaryLoading(false)
    }
  }

  async function loadReports(targetPage = page) {
    if (!validateRange(filterFrom, filterTo, false)) return
    setReportsLoading(true)
    try {
      const result = await getRevenueReports(
        keyword,
        status,
        filterFrom,
        filterTo,
        targetPage,
        10,
      )
      setReports(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(1, result.totalPages || 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : 'Không tải được danh sách báo cáo doanh thu.',
      )
    } finally {
      setReportsLoading(false)
    }
  }

  async function clearReportFilters() {
    setKeyword('')
    setStatus('')
    setFilterFrom('')
    setFilterTo('')
    setError('')
    setMessage('')
    setReportsLoading(true)
    try {
      const result = await getRevenueReports('', '', '', '', 1, 10)
      setReports(result.items ?? [])
      setPage(result.pageNumber || 1)
      setTotalPages(Math.max(1, result.totalPages || 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : 'Không tải được danh sách báo cáo doanh thu.',
      )
    } finally {
      setReportsLoading(false)
    }
  }

  useEffect(() => {
    setError('')
    void Promise.all([loadSummary(defaultRange.fromDate, defaultRange.toDate), loadReports(1)])
  }, [])

  realtimeRefreshRef.current = () => {
    void Promise.all([
      loadSummary(summaryFrom, summaryTo),
      loadReports(page),
    ])
  }

  useEffect(() => {
    const refreshRevenue = (event: Event) => {
      const notification = (event as CustomEvent<AdminNotification>).detail
      if (!notification?.type.startsWith('Payment.')) return
      realtimeRefreshRef.current()
    }

    window.addEventListener(ADMIN_NOTIFICATION_EVENT, refreshRevenue)
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATION_EVENT, refreshRevenue)
    }
  }, [])

  const topItems = useMemo(
    () => [...(summary?.items ?? [])].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 6),
    [summary],
  )
  const maxItemRevenue = Math.max(1, ...topItems.map(item => item.totalRevenue))
  const modalOpen = Boolean(detail) || createOpen || Boolean(editing)

  useEffect(() => {
    if (!modalOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return
      if (editing) {
        setEditing(null)
        return
      }
      if (createOpen) {
        setCreateOpen(false)
        return
      }
      setDetail(null)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [createOpen, editing, modalOpen, saving])

  async function applyQuickPeriod(period: Exclude<RevenuePeriod, 'custom'>) {
    const range = getQuickRange(period)
    setActivePeriod(period)
    setSummaryFrom(range.fromDate)
    setSummaryTo(range.toDate)
    setError('')
    setMessage('')
    await loadSummary(range.fromDate, range.toDate)
  }

  function openCreate() {
    setFormFrom(summaryFrom)
    setFormTo(summaryTo)
    setNote('')
    setError('')
    setMessage('')
    setDetail(null)
    setEditing(null)
    setCreateOpen(true)
  }

  function openEdit(report: RevenueReport) {
    setDetail(null)
    setCreateOpen(false)
    setEditing(report)
    setNote(report.note ?? '')
    setError('')
    setMessage('')
  }

  async function submitSummary(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    setActivePeriod('custom')
    await loadSummary(summaryFrom, summaryTo)
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!validateRange(formFrom, formTo)) return
    setSaving(true)
    try {
      const result = await createRevenueReport(formFrom, formTo, note)
      setMessage(result.message ?? 'Tạo báo cáo doanh thu thành công.')
      setCreateOpen(false)
      setSummaryFrom(formFrom)
      setSummaryTo(formTo)
      setActivePeriod('custom')
      await Promise.all([loadSummary(formFrom, formTo), loadReports(1)])
      setDetail(await getRevenueReport(result.data.id))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tạo được báo cáo doanh thu.')
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await updateRevenueReport(editing.id, null, note)
      setMessage(result.message ?? 'Cập nhật báo cáo doanh thu thành công.')
      setEditing(null)
      await loadReports(page)
      if (detail?.id === editing.id) setDetail(await getRevenueReport(editing.id))
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : 'Không cập nhật được báo cáo doanh thu.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(report: RevenueReport) {
    setError('')
    setCreateOpen(false)
    setEditing(null)
    try {
      setDetail(await getRevenueReport(report.id))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được chi tiết báo cáo.')
    }
  }

  async function exportReport(report: RevenueReport, format: RevenueExportFormat) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const current = await getRevenueReport(report.id)
      await updateRevenueReport(current.id, 'Exported', current.note ?? '')

      if (format === 'xlsx') {
        downloadRevenueReportXlsx(current)
      } else {
        downloadRevenueReportCsv(current)
      }

      setMessage(`Đã xuất ${current.reportCode} thành tệp ${format.toUpperCase()}.`)
      await loadReports(page)
      if (detail?.id === current.id) setDetail(await getRevenueReport(current.id))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không xuất được báo cáo.')
    } finally {
      setSaving(false)
    }
  }

  async function printReport(report: RevenueReport) {
    const popup = window.open('', '_blank', 'width=1000,height=760')
    if (!popup) {
      setError('Trình duyệt đang chặn cửa sổ in.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const current = await getRevenueReport(report.id)
      const itemRows = (current.items ?? [])
        .map(
          item =>
            `<tr><td>${escapeHtml(item.menuItemName)}</td><td>${item.quantitySold}</td><td class="right">${money(item.totalRevenue)}</td></tr>`,
        )
        .join('')
      popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(current.reportCode)}</title><style>body{font-family:Arial,sans-serif;max-width:920px;margin:28px auto;color:#162033}h1{text-align:center;margin-bottom:6px}.subtitle{text-align:center;color:#64748b}.meta,.totals{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:24px 0}.meta div,.totals div{padding:12px;border:1px solid #e2e8f0;border-radius:8px}.totals strong{display:block;margin-top:5px;font-size:18px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left}.right{text-align:right}.note{margin-top:22px;padding:12px;background:#f8fafc}.print-button{margin-top:22px;padding:10px 16px}@media print{.print-button{display:none}}</style></head><body><h1>BÁO CÁO DOANH THU</h1><p class="subtitle">${escapeHtml(current.reportCode)} • ${displayDate(current.fromDate)} - ${displayDate(current.toDate)}</p><div class="meta"><div>Ngày tạo<strong>${displayDateTime(current.generatedAt)}</strong></div><div>Trạng thái<strong>${escapeHtml(statusLabels[current.status] ?? current.status)}</strong></div><div>Số hóa đơn<strong>${current.totalInvoices}</strong></div><div>Số đơn hàng<strong>${current.totalOrders}</strong></div></div><div class="totals"><div>Tổng tiền món<strong>${money(current.totalAmount)}</strong></div><div>Giảm giá<strong>-${money(current.totalDiscountAmount)}</strong></div><div>VAT<strong>+${money(current.totalVatAmount)}</strong></div><div>Doanh thu thực thu<strong>${money(current.totalRevenue)}</strong></div></div><h2>Doanh thu theo món</h2><table><thead><tr><th>Món</th><th>Số lượng bán</th><th class="right">Doanh thu</th></tr></thead><tbody>${itemRows || '<tr><td colspan="3">Không có dữ liệu món.</td></tr>'}</tbody></table>${current.note ? `<p class="note">Ghi chú: ${escapeHtml(current.note)}</p>` : ''}<button class="print-button" onclick="window.print()">In báo cáo</button><script>window.onload=()=>window.print()</script></body></html>`)
      popup.document.close()
      await updateRevenueReport(current.id, 'Printed', current.note ?? '')
      setMessage(`Đã mở bản in ${current.reportCode}.`)
      await loadReports(page)
      if (detail?.id === current.id) setDetail(await getRevenueReport(current.id))
    } catch (exception) {
      popup.close()
      setError(exception instanceof Error ? exception.message : 'Không in được báo cáo.')
    } finally {
      setSaving(false)
    }
  }

  async function cancel(report: RevenueReport) {
    if (!await confirmAction(`Hủy báo cáo ${report.reportCode}?`)) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await cancelRevenueReport(report.id)
      setMessage(result.message ?? 'Hủy báo cáo doanh thu thành công.')
      setDetail(null)
      await loadReports(page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không hủy được báo cáo doanh thu.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="revenue-reports-page">
      <div className="revenue-command-bar">
        <div className="revenue-breadcrumb" aria-label="Đường dẫn trang">
          <span>Báo cáo</span>
          <ChevronRightIcon />
          <strong>Doanh thu</strong>
        </div>
        <div className="revenue-toolbar-actions">
          <button
            type="button"
            className="revenue-refresh-button"
            disabled={summaryLoading || reportsLoading}
            onClick={() => {
              setError('')
              setMessage('')
              void Promise.all([loadSummary(), loadReports(page)])
            }}
          >
            <RefreshIcon />
            <span>Làm mới</span>
          </button>
          <button type="button" className="revenue-primary-button" onClick={openCreate}>
            <PlusIcon />
            <span>Tạo báo cáo</span>
          </button>
        </div>
      </div>

      {message && <div className="inline-alert success">{message}</div>}
      {error && <div className="inline-alert error">{error}</div>}

      <form className="revenue-period-card" onSubmit={submitSummary}>
        <div className="revenue-period-presets" aria-label="Chọn nhanh khoảng phân tích">
          {([
            ['today', 'Hôm nay'],
            ['week', '7 ngày gần nhất'],
            ['month', 'Tháng này'],
            ['year', 'Năm nay'],
          ] as Array<[Exclude<RevenuePeriod, 'custom'>, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activePeriod === value ? 'active' : ''}
              disabled={summaryLoading}
              onClick={() => void applyQuickPeriod(value)}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={activePeriod === 'custom' ? 'active' : ''}
            onClick={() => setActivePeriod('custom')}
          >
            Tùy chọn ngày
          </button>
        </div>
        <div className="revenue-period-fields">
          <div className="revenue-period-copy">
            <strong>Khoảng phân tích</strong>
            <span>Số liệu trực tiếp từ các giao dịch đã thanh toán.</span>
          </div>
          <label>
            <span>Từ ngày</span>
            <input
              type="date"
              required
              value={summaryFrom}
              max={summaryTo}
              onChange={event => {
                setSummaryFrom(event.target.value)
                setActivePeriod('custom')
              }}
            />
          </label>
          <label>
            <span>Đến ngày</span>
            <input
              type="date"
              required
              value={summaryTo}
              min={summaryFrom}
              onChange={event => {
                setSummaryTo(event.target.value)
                setActivePeriod('custom')
              }}
            />
          </label>
          <button type="submit" className="revenue-view-button" disabled={summaryLoading}>
            <TrendIcon />
            <span>{summaryLoading ? 'Đang tổng hợp' : 'Xem dữ liệu'}</span>
          </button>
        </div>
      </form>

      <div className="revenue-summary-grid">
        <article className="revenue-summary-card revenue-tone-green">
          <div>
            <span>Doanh thu thực thu</span>
            <strong>{summaryLoading ? '—' : money(summary?.totalRevenue ?? 0)}</strong>
            <small>{displayDate(summaryFrom)} – {displayDate(summaryTo)}</small>
          </div>
          <span className="revenue-metric-icon"><TrendIcon /></span>
        </article>
        <article className="revenue-summary-card revenue-tone-amber">
          <div>
            <span>Giao dịch đã thanh toán</span>
            <strong>{summaryLoading ? '—' : summary?.totalInvoices ?? 0}</strong>
            <small>{summary?.totalOrders ?? 0} đơn hàng</small>
          </div>
          <span className="revenue-metric-icon"><ReceiptIcon /></span>
        </article>
        <article className="revenue-summary-card revenue-tone-blue">
          <div>
            <span>Trung bình / giao dịch</span>
            <strong>{summaryLoading ? '—' : money(summary?.averageRevenuePerInvoice ?? 0)}</strong>
            <small>Giá trị trung bình mỗi hóa đơn</small>
          </div>
          <span className="revenue-metric-icon"><AverageIcon /></span>
        </article>
        <article className="revenue-summary-card revenue-tone-rose">
          <div>
            <span>Tổng giảm giá</span>
            <strong>{summaryLoading ? '—' : money(summary?.totalDiscountAmount ?? 0)}</strong>
            <small>VAT cộng {money(summary?.totalVatAmount ?? 0)}</small>
          </div>
          <span className="revenue-metric-icon"><DiscountIcon /></span>
        </article>
      </div>

      <div className="revenue-insights-grid">
        <article className="revenue-report-panel">
          <div className="revenue-report-panel-heading">
            <div>
              <h3>Top món theo doanh thu</h3>
              <p>So sánh các món có doanh thu cao nhất trong khoảng đang chọn.</p>
            </div>
          </div>
          {summaryLoading ? (
            <div className="revenue-empty">Đang tải biểu đồ...</div>
          ) : topItems.length === 0 ? (
            <div className="revenue-empty">Chưa có dữ liệu món trong khoảng thời gian này.</div>
          ) : (
            <div
              className="top-items-chart"
              role="img"
              aria-label="Biểu đồ top món theo doanh thu"
            >
              {topItems.map((item, index) => (
                <div className="top-item-row" key={`${item.menuItemId}-${item.unitPrice}`}>
                  <span className="top-item-rank">{index + 1}</span>
                  <div className="top-item-content">
                    <div className="top-item-label">
                      <strong>{item.menuItemName}</strong>
                      <span>
                        {item.quantity} phần • {money(item.totalRevenue)}
                      </span>
                    </div>
                    <div className="top-item-track">
                      <span style={{ width: `${(item.totalRevenue / maxItemRevenue) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="revenue-report-panel">
          <div className="revenue-report-panel-heading">
            <div>
              <h3>Cơ cấu doanh thu</h3>
              <p>Đối chiếu tiền món, giảm giá, VAT và số tiền thực thu.</p>
            </div>
          </div>
          <div className="revenue-breakdown">
            <div>
              <span>Tổng tiền món</span>
              <strong>{money(summary?.totalAmount ?? 0)}</strong>
            </div>
            <div className="negative">
              <span>Giảm giá</span>
              <strong>-{money(summary?.totalDiscountAmount ?? 0)}</strong>
            </div>
            <div className="positive">
              <span>VAT</span>
              <strong>+{money(summary?.totalVatAmount ?? 0)}</strong>
            </div>
            <div className="revenue-net">
              <span>Doanh thu thực thu</span>
              <strong>{money(summary?.totalRevenue ?? 0)}</strong>
            </div>
            <div>
              <span>Tổng khách thanh toán</span>
              <strong>{money(summary?.totalCustomerPaid ?? 0)}</strong>
            </div>
            <div>
              <span>Tiền thừa hoàn lại</span>
              <strong>{money(summary?.totalChangeAmount ?? 0)}</strong>
            </div>
            {(summary?.paymentMethods ?? []).map(paymentMethod => (
              <div key={paymentMethod.paymentMethod}>
                <span>
                  {paymentMethodLabels[paymentMethod.paymentMethod]
                    ?? paymentMethod.paymentMethod}
                  {' · '}
                  {paymentMethod.paymentCount} giao dịch
                </span>
                <strong>{money(paymentMethod.totalAmount)}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="revenue-report-panel saved-reports-panel">
        <div className="revenue-report-panel-heading">
          <div>
            <h3>Báo cáo đã lưu</h3>
            <p>Tìm kiếm, xem chi tiết, xuất CSV/XLSX, in hoặc hủy báo cáo.</p>
          </div>
          <span>{totalCount} báo cáo</span>
        </div>

        <form
          className="revenue-report-filters"
          onSubmit={event => {
            event.preventDefault()
            setError('')
            setMessage('')
            void loadReports(1)
          }}
        >
          <label className="revenue-search-field">
            <span className="sr-only">Tìm báo cáo</span>
            <SearchIcon />
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm mã hoặc trạng thái báo cáo..."
            />
          </label>
          <label className="revenue-filter-field">
            <span>Trạng thái</span>
            <select value={status} onChange={event => setStatus(event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="Generated">Đã tạo</option>
              <option value="Exported">Đã xuất</option>
              <option value="Printed">Đã in</option>
              <option value="Cancelled">Đã hủy</option>
            </select>
          </label>
          <label className="revenue-filter-field">
            <span>Từ ngày</span>
            <input
              type="date"
              aria-label="Báo cáo từ ngày"
              value={filterFrom}
              max={filterTo || undefined}
              onChange={event => setFilterFrom(event.target.value)}
            />
          </label>
          <label className="revenue-filter-field">
            <span>Đến ngày</span>
            <input
              type="date"
              aria-label="Báo cáo đến ngày"
              value={filterTo}
              min={filterFrom || undefined}
              onChange={event => setFilterTo(event.target.value)}
            />
          </label>
          <button type="submit" className="revenue-filter-button">
            <SearchIcon />
            <span>Lọc</span>
          </button>
          <button
            type="button"
            className="clear-filter"
            onClick={() => void clearReportFilters()}
          >
            Xóa lọc
          </button>
        </form>

        <div className="revenue-table-wrap">
          <table className="revenue-report-table">
            <thead>
              <tr>
                <th>Mã báo cáo</th>
                <th>Khoảng thời gian</th>
                <th>Hóa đơn / Đơn</th>
                <th>Doanh thu</th>
                <th>Trung bình</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reportsLoading ? (
                <tr>
                  <td colSpan={7}>Đang tải...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td className="revenue-empty-cell" colSpan={7}>
                    Chưa có báo cáo phù hợp.
                  </td>
                </tr>
              ) : (
                reports.map(report => (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.reportCode}</strong>
                      <small>Tạo {displayDateTime(report.generatedAt)}</small>
                    </td>
                    <td>
                      <strong>{displayDate(report.fromDate)}</strong>
                      <small>đến {displayDate(report.toDate)}</small>
                    </td>
                    <td>
                      <strong>{report.totalInvoices} hóa đơn</strong>
                      <small>{report.totalOrders} đơn hàng</small>
                    </td>
                    <td>
                      <strong>{money(report.totalRevenue)}</strong>
                      <small>VAT {money(report.totalVatAmount)}</small>
                    </td>
                    <td>{money(report.averageRevenuePerInvoice)}</td>
                    <td>
                      <span className={`revenue-status ${report.status.toLowerCase()}`}>
                        {statusLabels[report.status] ?? report.status}
                      </span>
                    </td>
                    <td>
                      <div className="revenue-actions">
                        <button
                          type="button"
                          title="Xem chi tiết"
                          aria-label={`Xem chi tiết báo cáo ${report.reportCode}`}
                          onClick={() => void openDetail(report)}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          title="Sửa ghi chú"
                          aria-label={`Sửa báo cáo ${report.reportCode}`}
                          disabled={saving || report.status === 'Cancelled'}
                          onClick={() => openEdit(report)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          title="Xuất CSV"
                          aria-label={`Xuất CSV báo cáo ${report.reportCode}`}
                          disabled={saving || report.status === 'Cancelled'}
                          onClick={() => void exportReport(report, 'csv')}
                        >
                          <DownloadIcon />
                        </button>
                        <button
                          type="button"
                          title="Xuất Excel (.xlsx)"
                          aria-label={`Xuất Excel báo cáo ${report.reportCode}`}
                          disabled={saving || report.status === 'Cancelled'}
                          onClick={() => void exportReport(report, 'xlsx')}
                        >
                          <span aria-hidden="true">X</span>
                        </button>
                        <button
                          type="button"
                          title="In báo cáo"
                          aria-label={`In báo cáo ${report.reportCode}`}
                          disabled={saving || report.status === 'Cancelled'}
                          onClick={() => void printReport(report)}
                        >
                          <PrinterIcon />
                        </button>
                        <button
                          type="button"
                          className="danger"
                          title="Hủy báo cáo"
                          aria-label={`Hủy báo cáo ${report.reportCode}`}
                          disabled={saving || report.status === 'Cancelled'}
                          onClick={() => void cancel(report)}
                        >
                          <CancelIcon />
                        </button>
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
            Trang {page}/{totalPages} • {totalCount} báo cáo
          </span>
          <div>
            <button
              type="button"
              disabled={page <= 1 || reportsLoading}
              onClick={() => void loadReports(page - 1)}
            >
              <ArrowLeftIcon />
              <span>Trước</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages || reportsLoading}
              onClick={() => void loadReports(page + 1)}
            >
              <span>Sau</span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </article>

      {detail && !editing && !createOpen && (
        <div className="modal-backdrop revenue-modal-backdrop" onMouseDown={() => !saving && setDetail(null)}>
          <div
            className="revenue-detail-modal revenue-dark-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revenue-detail-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="revenue-modal-kicker">BÁO CÁO ĐÃ LƯU</span>
                <h2 id="revenue-detail-title">CHI TIẾT BÁO CÁO DOANH THU</h2>
                <p>
                  {detail.reportCode} • {displayDate(detail.fromDate)} – {displayDate(detail.toDate)}
                </p>
              </div>
              <button type="button" aria-label="Đóng chi tiết báo cáo" onClick={() => setDetail(null)}>
                <CloseIcon />
              </button>
            </div>
            <div className="revenue-detail-content">
              <div className="revenue-detail-meta">
                <span>
                  Trạng thái
                  <strong>{statusLabels[detail.status] ?? detail.status}</strong>
                </span>
                <span>
                  Ngày tạo
                  <strong>{displayDateTime(detail.generatedAt)}</strong>
                </span>
                <span>
                  Hóa đơn
                  <strong>{detail.totalInvoices}</strong>
                </span>
                <span>
                  Đơn hàng
                  <strong>{detail.totalOrders}</strong>
                </span>
              </div>
              <div className="revenue-detail-totals">
                <span>
                  Tổng tiền món <strong>{money(detail.totalAmount)}</strong>
                </span>
                <span>
                  Giảm giá <strong>-{money(detail.totalDiscountAmount)}</strong>
                </span>
                <span>
                  VAT <strong>+{money(detail.totalVatAmount)}</strong>
                </span>
                <span className="final">
                  Doanh thu <strong>{money(detail.totalRevenue)}</strong>
                </span>
                <span>
                  Khách đưa <strong>{money(detail.totalCustomerPaid)}</strong>
                </span>
                <span>
                  Tiền thối <strong>{money(detail.totalChangeAmount)}</strong>
                </span>
              </div>
              <div className="revenue-detail-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Món</th>
                      <th>Số lượng bán</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3}>Không có dữ liệu món.</td>
                      </tr>
                    ) : (
                      detail.items.map(item => (
                        <tr key={item.id}>
                          <td>{item.menuItemName}</td>
                          <td>{item.quantitySold}</td>
                          <td>{money(item.totalRevenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {detail.note && <p className="revenue-note">Ghi chú: {detail.note}</p>}
            </div>
            <div className="revenue-detail-actions">
              <button type="button" onClick={() => setDetail(null)}>
                Đóng
              </button>
              <button
                type="button"
                disabled={saving || detail.status === 'Cancelled'}
                onClick={() => void exportReport(detail, 'csv')}
              >
                <DownloadIcon />
                <span>Xuất CSV</span>
              </button>
              <button
                type="button"
                disabled={saving || detail.status === 'Cancelled'}
                onClick={() => void exportReport(detail, 'xlsx')}
              >
                <DownloadIcon />
                <span>Xuất Excel</span>
              </button>
              <button
                type="button"
                className="revenue-primary-button"
                disabled={saving || detail.status === 'Cancelled'}
                onClick={() => void printReport(detail)}
              >
                <PrinterIcon />
                <span>In báo cáo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="modal-backdrop revenue-modal-backdrop" onMouseDown={() => !saving && setCreateOpen(false)}>
          <div
            className="employee-modal revenue-form-modal revenue-dark-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-revenue-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="revenue-modal-kicker">DOANH THU</span>
                <h2 id="create-revenue-title">TẠO BÁO CÁO MỚI</h2>
                <p>Lưu ảnh chụp số liệu từ các hóa đơn hợp lệ trong khoảng đã chọn.</p>
              </div>
              <button type="button" aria-label="Đóng cửa sổ tạo báo cáo" onClick={() => setCreateOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <form className="revenue-form" onSubmit={submitCreate}>
              <div className="revenue-form-grid">
                <label>
                  <span>Từ ngày <em>*</em></span>
                  <input
                    type="date"
                    required
                    value={formFrom}
                    max={formTo}
                    onChange={event => setFormFrom(event.target.value)}
                  />
                </label>
                <label>
                  <span>Đến ngày <em>*</em></span>
                  <input
                    type="date"
                    required
                    value={formTo}
                    min={formFrom}
                    onChange={event => setFormTo(event.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>Ghi chú</span>
                <textarea
                  value={note}
                  maxLength={500}
                  placeholder="Ví dụ: Báo cáo doanh thu tháng 7"
                  onChange={event => setNote(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setCreateOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="revenue-primary-button" disabled={saving}>
                  <PlusIcon />
                  <span>{saving ? 'Đang tạo...' : 'Tạo báo cáo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop revenue-modal-backdrop" onMouseDown={() => !saving && setEditing(null)}>
          <div
            className="employee-modal revenue-form-modal revenue-dark-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-revenue-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <span className="revenue-modal-kicker">BÁO CÁO ĐÃ LƯU</span>
                <h2 id="edit-revenue-title">CẬP NHẬT GHI CHÚ</h2>
                <p>{editing.reportCode}</p>
              </div>
              <button type="button" aria-label="Đóng cửa sổ cập nhật" onClick={() => setEditing(null)}>
                <CloseIcon />
              </button>
            </div>
            <form className="revenue-form" onSubmit={submitEdit}>
              <label>
                <span>Ghi chú</span>
                <textarea
                  value={note}
                  maxLength={500}
                  onChange={event => setNote(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setEditing(null)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="revenue-primary-button" disabled={saving}>
                  <EditIcon />
                  <span>{saving ? 'Đang lưu...' : 'Cập nhật'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
