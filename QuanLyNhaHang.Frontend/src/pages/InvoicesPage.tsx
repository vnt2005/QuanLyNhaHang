import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { getPayments, type Payment } from '../api/payments'
import {
  ADMIN_NOTIFICATION_EVENT,
  type AdminNotification,
} from '../api/notifications'
import {
  cancelInvoice,
  createInvoice,
  getInvoice,
  getInvoices,
  updateInvoice,
  type Invoice,
} from '../api/invoices'
import { confirmAction } from '../design-system/confirmDialog'
import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'

const methods = [
  'BankTransfer',
  'Cash',
  'Card',
  'EWallet',
  'Momo',
  'ZaloPay',
  'Other',
]

const methodLabels: Record<string, string> = {
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản QR/ngân hàng',
  Card: 'Thẻ',
  EWallet: 'Ví điện tử',
  Momo: 'MoMo',
  ZaloPay: 'ZaloPay',
  Other: 'Khác',
}

const statusLabels: Record<string, string> = {
  Issued: 'Đã phát hành',
  Printed: 'Đã in',
  Cancelled: 'Đã hủy',
}

const money = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
}).format(value)

function paidAmountLabel(paymentMethod: string) {
  if (paymentMethod === 'Cash') return 'Khách đưa'
  if (paymentMethod === 'BankTransfer') return 'Đã chuyển khoản'
  if (paymentMethod === 'Card') return 'Đã thanh toán thẻ'
  return 'Đã thanh toán'
}

function changeAmountLabel(paymentMethod: string) {
  return paymentMethod === 'Cash' ? 'Tiền thối' : 'Tiền hoàn lại'
}

function ChevronRightIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.4-3.4" /></svg>
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function ReceiptIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6M9 16h3" /></svg>
}

function DocumentCheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l4 4v14H7V3Z" /><path d="M14 3v5h5M9.5 14l1.8 1.8 3.7-4" /></svg>
}

function PrinterIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v7H7z" /></svg>
}

function WalletIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19v16H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" /><path d="M4 7h15M15 11h6v5h-6a2.5 2.5 0 0 1 0-5Z" /></svg>
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 6.5 17.5 10.5M4 20l4.2-.9L19 8.3a2.8 2.8 0 0 0-4-4L4.2 15.1 4 20Z" /></svg>
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [detail, setDetail] = useState<Invoice | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [paymentId, setPaymentId] = useState('')
  const [note, setNote] = useState('')
  const realtimeRefreshRef = useRef<() => void>(() => undefined)

  useAutoDismissMessage(message, setMessage)

  async function loadInvoices(targetPage = page) {
    setLoading(true)
    setError('')
    try {
      const result = await getInvoices(keyword, status, method, targetPage, 10)
      setInvoices(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(1, result.totalPages || 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được danh sách hóa đơn.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadEligiblePayments() {
    try {
      const [paid, allInvoices] = await Promise.all([
        getPayments('', 'Paid', '', 1, 100),
        getInvoices('', '', '', 1, 500),
      ])
      const activePaymentIds = new Set(
        (allInvoices.items ?? [])
          .filter((invoice) => invoice.status !== 'Cancelled')
          .map((invoice) => invoice.paymentId),
      )
      setPayments(
        (paid.items ?? []).filter((payment) => !activePaymentIds.has(payment.id)),
      )
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được thanh toán chưa xuất hóa đơn.',
      )
    }
  }

  useEffect(() => {
    void Promise.all([loadInvoices(1), loadEligiblePayments()])
  }, [])

  realtimeRefreshRef.current = () => {
    void Promise.all([loadInvoices(page), loadEligiblePayments()])
  }

  useEffect(() => {
    const refreshPaidInvoices = (event: Event) => {
      const notification = (event as CustomEvent<AdminNotification>).detail
      if (!notification?.type.startsWith('Payment.')) return
      realtimeRefreshRef.current()
    }

    window.addEventListener(ADMIN_NOTIFICATION_EVENT, refreshPaidInvoices)
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATION_EVENT, refreshPaidInvoices)
    }
  }, [])

  const modalOpen = Boolean(detail) || createOpen || editOpen

  useEffect(() => {
    if (!modalOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return
      if (editOpen) {
        setEditOpen(false)
        setDetail(null)
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
  }, [createOpen, editOpen, modalOpen, saving])

  const summary = useMemo(() => ({
    issued: invoices.filter((invoice) => invoice.status === 'Issued').length,
    printed: invoices.filter((invoice) => invoice.status === 'Printed').length,
    amount: invoices
      .filter((invoice) => invoice.status !== 'Cancelled')
      .reduce((sum, invoice) => sum + invoice.finalAmount, 0),
  }), [invoices])

  async function openDetail(invoice: Invoice) {
    setError('')
    setEditOpen(false)
    try {
      setDetail(await getInvoice(invoice.id))
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được chi tiết hóa đơn.',
      )
    }
  }

  function openCreate() {
    setPaymentId('')
    setNote('')
    setError('')
    setMessage('')
    setDetail(null)
    setCreateOpen(true)
    void loadEligiblePayments()
  }

  function openEdit(invoice: Invoice) {
    setDetail(invoice)
    setNote(invoice.note ?? '')
    setError('')
    setMessage('')
    setEditOpen(true)
  }

  function closeEdit() {
    if (saving) return
    setEditOpen(false)
    setDetail(null)
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!paymentId) {
      setError('Vui lòng chọn thanh toán.')
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await createInvoice(paymentId, note)
      setMessage(result.message ?? 'Tạo hóa đơn thành công.')
      setCreateOpen(false)
      await Promise.all([loadInvoices(1), loadEligiblePayments()])
      setDetail(await getInvoice(result.data.id))
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tạo được hóa đơn.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!detail) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await updateInvoice(detail.id, null, note)
      setMessage(result.message ?? 'Cập nhật hóa đơn thành công.')
      setEditOpen(false)
      await loadInvoices(page)
      setDetail(await getInvoice(detail.id))
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không cập nhật được hóa đơn.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function markPrinted(invoice: Invoice) {
    if (!await confirmAction(`Đánh dấu hóa đơn ${invoice.invoiceCode} là đã in?`)) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await updateInvoice(invoice.id, 'Printed', invoice.note ?? '')
      setMessage(result.message ?? 'Đã cập nhật trạng thái in.')
      await loadInvoices(page)
      setDetail(await getInvoice(invoice.id))
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không cập nhật được trạng thái hóa đơn.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove(invoice: Invoice) {
    if (!await confirmAction(`Hủy hóa đơn ${invoice.invoiceCode}?`)) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await cancelInvoice(invoice.id)
      setMessage(result.message ?? 'Hủy hóa đơn thành công.')
      setDetail(null)
      await Promise.all([loadInvoices(page), loadEligiblePayments()])
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không hủy được hóa đơn.',
      )
    } finally {
      setSaving(false)
    }
  }

  function printInvoice(invoice: Invoice) {
    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) {
      setError('Trình duyệt đang chặn cửa sổ in.')
      return
    }

    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceCode}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:32px auto;color:#111}h1{text-align:center}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.right{text-align:right}.total{font-size:20px;font-weight:700}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.note{margin-top:24px}@media print{button{display:none}}</style></head><body><h1>HÓA ĐƠN THANH TOÁN</h1><div class="meta"><div>Mã hóa đơn: <strong>${invoice.invoiceCode}</strong></div><div>Ngày: ${new Date(invoice.issuedAt).toLocaleString('vi-VN')}</div><div>Mã đơn: ${invoice.orderCode}</div><div>Bàn: ${invoice.restaurantTableName}</div><div>Mã thanh toán: ${invoice.paymentCode}</div><div>Phương thức: ${methodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</div></div><table><thead><tr><th>Món</th><th>SL</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr></thead><tbody>${invoice.items.map((item) => `<tr><td>${item.menuItemName}${item.note ? `<br><small>${item.note}</small>` : ''}</td><td>${item.quantity}</td><td class="right">${money(item.unitPrice)}</td><td class="right">${money(item.totalPrice)}</td></tr>`).join('')}</tbody></table><p>Tổng tiền: <strong>${money(invoice.totalAmount)}</strong></p><p>Giảm giá: -${money(invoice.discountAmount)}</p><p>Phí phục vụ: +${money(invoice.serviceChargeAmount)}</p><p>VAT: +${money(invoice.vatAmount)}</p><p class="total">Thanh toán: ${money(invoice.finalAmount)}</p><p>${paidAmountLabel(invoice.paymentMethod)}: ${money(invoice.customerPaid)} — ${changeAmountLabel(invoice.paymentMethod)}: ${money(invoice.changeAmount)}</p>${invoice.note ? `<p class="note">Ghi chú: ${invoice.note}</p>` : ''}<button onclick="window.print()">In hóa đơn</button><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return (
    <section className="invoices-page">
      <div className="invoice-command-bar">
        <div className="invoice-breadcrumb" aria-label="Đường dẫn trang">
          <span>Kiểm soát</span>
          <ChevronRightIcon />
          <strong>Hóa đơn</strong>
        </div>
        <button type="button" className="invoice-primary-button" onClick={openCreate}>
          <PlusIcon />
          <span>Tạo hóa đơn</span>
        </button>
      </div>

      <div className="invoice-metrics" aria-label="Tổng quan hóa đơn">
        <article>
          <span className="invoice-metric-icon"><ReceiptIcon /></span>
          <div><small>Tổng hóa đơn</small><strong>{totalCount}</strong></div>
        </article>
        <article>
          <span className="invoice-metric-icon"><DocumentCheckIcon /></span>
          <div><small>Đã phát hành trên trang</small><strong>{summary.issued}</strong></div>
        </article>
        <article>
          <span className="invoice-metric-icon"><PrinterIcon /></span>
          <div><small>Đã in trên trang</small><strong>{summary.printed}</strong></div>
        </article>
        <article>
          <span className="invoice-metric-icon"><WalletIcon /></span>
          <div><small>Giá trị trên trang</small><strong>{money(summary.amount)}</strong></div>
        </article>
      </div>

      {message ? <div className="inline-alert success">{message}</div> : null}
      {error ? <div className="inline-alert error">{error}</div> : null}

      <form
        className="invoice-control-band"
        onSubmit={(event) => {
          event.preventDefault()
          void loadInvoices(1)
        }}
      >
        <label className="invoice-search-field">
          <span className="sr-only">Tìm kiếm hóa đơn</span>
          <SearchIcon />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm mã hóa đơn, đơn, thanh toán hoặc bàn..."
          />
        </label>
        <label className="invoice-filter-field">
          <span>Trạng thái</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="Issued">Đã phát hành</option>
            <option value="Printed">Đã in</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
        </label>
        <label className="invoice-filter-field">
          <span>Phương thức</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="">Tất cả phương thức</option>
            {methods.map((value) => (
              <option key={value} value={value}>{methodLabels[value]}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="invoice-filter-button" disabled={loading}>
          <SearchIcon />
          <span>{loading ? 'Đang lọc' : 'Áp dụng'}</span>
        </button>
      </form>

      <div className="invoice-result-row">
        <span>Tìm thấy <strong>{totalCount}</strong> hóa đơn</span>
      </div>

      <div className="invoice-table-panel">
        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Mã hóa đơn</th>
                <th>Đơn / Bàn</th>
                <th>Phương thức</th>
                <th>Ngày phát hành</th>
                <th>Giá trị</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="invoice-empty-state">Đang tải dữ liệu...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={7} className="invoice-empty-state">Không có hóa đơn phù hợp.</td></tr>
              ) : invoices.map((invoice) => {
                const inactive = invoice.status === 'Cancelled'
                return (
                  <tr key={invoice.id}>
                    <td>
                      <div className="invoice-code-cell">
                        <strong>{invoice.invoiceCode}</strong>
                        <small>{invoice.paymentCode}</small>
                      </div>
                    </td>
                    <td>
                      <div className="invoice-order-cell">
                        <strong>{invoice.orderCode}</strong>
                        <small>{invoice.restaurantTableName}</small>
                      </div>
                    </td>
                    <td>
                      <span className="invoice-method-chip">
                        {methodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}
                      </span>
                    </td>
                    <td className="invoice-date-cell">
                      {new Date(invoice.issuedAt).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      <div className="invoice-value-cell">
                        <strong>{money(invoice.finalAmount)}</strong>
                        <small>{changeAmountLabel(invoice.paymentMethod)} {money(invoice.changeAmount)}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`invoice-status ${invoice.status.toLowerCase()}`}>
                        {statusLabels[invoice.status] ?? invoice.status}
                      </span>
                    </td>
                    <td>
                      <div className="invoice-actions">
                        <button
                          type="button"
                          title="Xem chi tiết"
                          aria-label={`Xem chi tiết hóa đơn ${invoice.invoiceCode}`}
                          onClick={() => void openDetail(invoice)}
                        >
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          title="Sửa ghi chú"
                          aria-label={`Sửa hóa đơn ${invoice.invoiceCode}`}
                          disabled={inactive}
                          onClick={() => openEdit(invoice)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          title="Đánh dấu đã in"
                          aria-label={`Đánh dấu hóa đơn ${invoice.invoiceCode} đã in`}
                          disabled={inactive}
                          onClick={() => void markPrinted(invoice)}
                        >
                          <PrinterIcon />
                        </button>
                        <button
                          type="button"
                          className="danger"
                          title="Hủy hóa đơn"
                          aria-label={`Hủy hóa đơn ${invoice.invoiceCode}`}
                          disabled={inactive}
                          onClick={() => void remove(invoice)}
                        >
                          <CancelIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="invoice-pagination">
          <span>Trang {page}/{totalPages} • {totalCount} hóa đơn</span>
          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void loadInvoices(page - 1)}
            >
              <ArrowLeftIcon />
              <span>Trước</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void loadInvoices(page + 1)}
            >
              <span>Sau</span>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>

      {detail && !editOpen ? (
        <div
          className="modal-backdrop invoice-modal-backdrop"
          onMouseDown={() => !saving && setDetail(null)}
        >
          <div
            className="invoice-detail-modal invoice-dark-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="invoice-detail-title">CHI TIẾT HÓA ĐƠN</h2>
                <p>{detail.orderCode} • {detail.restaurantTableName}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng chi tiết hóa đơn"
                onClick={() => setDetail(null)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="invoice-receipt-scroll">
              <article className="invoice-receipt">
                <header className="invoice-receipt-heading">
                  <span><ReceiptIcon /></span>
                  <div>
                    <small>BIÊN LAI THANH TOÁN</small>
                    <h3>{detail.invoiceCode}</h3>
                  </div>
                  <span className={`invoice-status ${detail.status.toLowerCase()}`}>
                    {statusLabels[detail.status] ?? detail.status}
                  </span>
                </header>

                <div className="invoice-meta">
                  <span><small>Thanh toán</small><strong>{detail.paymentCode}</strong></span>
                  <span><small>Ngày phát hành</small><strong>{new Date(detail.issuedAt).toLocaleString('vi-VN')}</strong></span>
                  <span><small>Phương thức</small><strong>{methodLabels[detail.paymentMethod] ?? detail.paymentMethod}</strong></span>
                  <span><small>Bàn phục vụ</small><strong>{detail.restaurantTableName}</strong></span>
                </div>

                <div className="invoice-receipt-table-wrap">
                  <table>
                    <thead>
                      <tr><th>Món</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
                    </thead>
                    <tbody>
                      {detail.items.map((item) => (
                        <tr key={item.id}>
                          <td><strong>{item.menuItemName}</strong>{item.note ? <small>{item.note}</small> : null}</td>
                          <td>{item.quantity}</td>
                          <td>{money(item.unitPrice)}</td>
                          <td>{money(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="invoice-total-section">
                  <div className="invoice-totals">
                    <span>Tổng tiền <strong>{money(detail.totalAmount)}</strong></span>
                    <span>Giảm giá <strong>-{money(detail.discountAmount)}</strong></span>
                    <span>Phí phục vụ <strong>+{money(detail.serviceChargeAmount)}</strong></span>
                    <span>VAT <strong>+{money(detail.vatAmount)}</strong></span>
                    <span className="final">Thanh toán <strong>{money(detail.finalAmount)}</strong></span>
                    <span>{paidAmountLabel(detail.paymentMethod)} <strong>{money(detail.customerPaid)}</strong></span>
                    <span>{changeAmountLabel(detail.paymentMethod)} <strong>{money(detail.changeAmount)}</strong></span>
                  </div>
                </div>

                {detail.note ? <p className="invoice-note">Ghi chú: {detail.note}</p> : null}
              </article>
            </div>

            <div className="invoice-modal-actions">
              <button type="button" onClick={() => setDetail(null)}>Đóng</button>
              <button type="button" onClick={() => printInvoice(detail)}>
                <PrinterIcon />
                <span>In hóa đơn</span>
              </button>
              <button
                type="button"
                className="invoice-primary-button"
                disabled={detail.status === 'Cancelled' || saving}
                onClick={() => void markPrinted(detail)}
              >
                <DocumentCheckIcon />
                <span>{saving ? 'Đang cập nhật' : 'Đánh dấu đã in'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div
          className="modal-backdrop invoice-modal-backdrop"
          onMouseDown={() => !saving && setCreateOpen(false)}
        >
          <div
            className="employee-modal invoice-form-modal invoice-dark-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-create-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div><h2 id="invoice-create-title">TẠO HÓA ĐƠN MỚI</h2></div>
              <button
                type="button"
                aria-label="Đóng cửa sổ tạo hóa đơn"
                onClick={() => setCreateOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <form className="invoice-form" onSubmit={submitCreate}>
              <p className="invoice-form-note">
                Chỉ hiển thị các thanh toán đã hoàn tất và chưa có hóa đơn hiệu lực.
              </p>
              <label>
                Thanh toán <em>*</em>
                <select
                  required
                  value={paymentId}
                  onChange={(event) => setPaymentId(event.target.value)}
                >
                  <option value="">Chọn thanh toán</option>
                  {payments.map((payment) => (
                    <option key={payment.id} value={payment.id}>
                      {payment.paymentCode} • {money(payment.finalAmount)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ghi chú
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Nhập ghi chú cho hóa đơn..."
                />
              </label>
              <div className="invoice-modal-actions">
                <button type="button" onClick={() => setCreateOpen(false)}>Đóng</button>
                <button type="submit" className="invoice-primary-button" disabled={saving}>
                  <ReceiptIcon />
                  <span>{saving ? 'Đang tạo...' : 'Tạo hóa đơn'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editOpen && detail ? (
        <div
          className="modal-backdrop invoice-modal-backdrop"
          onMouseDown={closeEdit}
        >
          <div
            className="employee-modal invoice-form-modal invoice-dark-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-edit-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <h2 id="invoice-edit-title">CẬP NHẬT HÓA ĐƠN</h2>
                <p>{detail.invoiceCode}</p>
              </div>
              <button type="button" aria-label="Đóng cửa sổ cập nhật hóa đơn" onClick={closeEdit}>
                <CloseIcon />
              </button>
            </div>
            <form className="invoice-form" onSubmit={submitEdit}>
              <label>
                Ghi chú
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Nhập ghi chú cho hóa đơn..."
                />
              </label>
              <div className="invoice-modal-actions">
                <button type="button" onClick={closeEdit}>Đóng</button>
                <button type="submit" className="invoice-primary-button" disabled={saving}>
                  <DocumentCheckIcon />
                  <span>{saving ? 'Đang lưu...' : 'Cập nhật'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  )
}
