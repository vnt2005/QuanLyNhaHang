import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { getPayments, type Payment } from '../api/payments'
import {
  cancelInvoice,
  createInvoice,
  getInvoice,
  getInvoices,
  updateInvoice,
  type Invoice,
  type InvoiceStatus,
} from '../api/invoices'

const methods = ['Cash', 'BankTransfer', 'Card', 'EWallet']
const methodLabels: Record<string, string> = {
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản',
  Card: 'Thẻ',
  EWallet: 'Ví điện tử',
}
const statusLabels: Record<string, string> = {
  Issued: 'Đã phát hành',
  Printed: 'Đã in',
  Cancelled: 'Đã hủy',
}
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

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
  useAutoDismissMessage(message, setMessage)
  const [detail, setDetail] = useState<Invoice | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [paymentId, setPaymentId] = useState('')
  const [note, setNote] = useState('')

  async function loadInvoices(targetPage = page) {
    setLoading(true); setError('')
    try {
      const result = await getInvoices(keyword, status, method, targetPage, 10)
      setInvoices(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(1, result.totalPages || 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được danh sách hóa đơn.')
    } finally { setLoading(false) }
  }

  async function loadEligiblePayments() {
    try {
      const [paid, allInvoices] = await Promise.all([
        getPayments('', 'Paid', '', 1, 100),
        getInvoices('', '', '', 1, 500),
      ])
      const activePaymentIds = new Set((allInvoices.items ?? []).filter(x => x.status !== 'Cancelled').map(x => x.paymentId))
      setPayments((paid.items ?? []).filter(x => !activePaymentIds.has(x.id)))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được thanh toán chưa xuất hóa đơn.')
    }
  }

  useEffect(() => { void Promise.all([loadInvoices(1), loadEligiblePayments()]) }, [])

  const summary = useMemo(() => ({
    issued: invoices.filter(x => x.status === 'Issued').length,
    printed: invoices.filter(x => x.status === 'Printed').length,
    cancelled: invoices.filter(x => x.status === 'Cancelled').length,
    amount: invoices.filter(x => x.status !== 'Cancelled').reduce((sum, x) => sum + x.finalAmount, 0),
  }), [invoices])

  async function openDetail(invoice: Invoice) {
    setError('')
    try { setDetail(await getInvoice(invoice.id)) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không tải được chi tiết hóa đơn.') }
  }

  function openCreate() {
    setPaymentId(''); setNote(''); setError(''); setMessage(''); setCreateOpen(true)
    void loadEligiblePayments()
  }

  function openEdit(invoice: Invoice) {
    setDetail(invoice); setNote(invoice.note ?? ''); setError(''); setMessage(''); setEditOpen(true)
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault()
    if (!paymentId) { setError('Vui lòng chọn thanh toán.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await createInvoice(paymentId, note)
      setMessage(result.message ?? 'Tạo hóa đơn thành công.')
      setCreateOpen(false)
      await Promise.all([loadInvoices(1), loadEligiblePayments()])
      setDetail(await getInvoice(result.data.id))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tạo được hóa đơn.')
    } finally { setSaving(false) }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault()
    if (!detail) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await updateInvoice(detail.id, null, note)
      setMessage(result.message ?? 'Cập nhật hóa đơn thành công.')
      setEditOpen(false)
      await loadInvoices(page)
      setDetail(await getInvoice(detail.id))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không cập nhật được hóa đơn.')
    } finally { setSaving(false) }
  }

  async function markPrinted(invoice: Invoice) {
    if (!await confirmAction(`Đánh dấu hóa đơn ${invoice.invoiceCode} là đã in?`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await updateInvoice(invoice.id, 'Printed', invoice.note ?? '')
      setMessage(result.message ?? 'Đã cập nhật trạng thái in.')
      await loadInvoices(page)
      setDetail(await getInvoice(invoice.id))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không cập nhật được trạng thái hóa đơn.')
    } finally { setSaving(false) }
  }

  async function remove(invoice: Invoice) {
    if (!await confirmAction(`Hủy hóa đơn ${invoice.invoiceCode}?`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await cancelInvoice(invoice.id)
      setMessage(result.message ?? 'Hủy hóa đơn thành công.')
      setDetail(null)
      await Promise.all([loadInvoices(page), loadEligiblePayments()])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không hủy được hóa đơn.')
    } finally { setSaving(false) }
  }

  function printInvoice(invoice: Invoice) {
    const popup = window.open('', '_blank', 'width=900,height=700')
    if (!popup) { setError('Trình duyệt đang chặn cửa sổ in.'); return }
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${invoice.invoiceCode}</title><style>body{font-family:Arial,sans-serif;max-width:720px;margin:32px auto;color:#111}h1{text-align:center}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.right{text-align:right}.total{font-size:20px;font-weight:700}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px}.note{margin-top:24px}@media print{button{display:none}}</style></head><body><h1>HÓA ĐƠN THANH TOÁN</h1><div class="meta"><div>Mã hóa đơn: <strong>${invoice.invoiceCode}</strong></div><div>Ngày: ${new Date(invoice.issuedAt).toLocaleString('vi-VN')}</div><div>Mã đơn: ${invoice.orderCode}</div><div>Bàn: ${invoice.restaurantTableName}</div><div>Mã thanh toán: ${invoice.paymentCode}</div><div>Phương thức: ${methodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</div></div><table><thead><tr><th>Món</th><th>SL</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr></thead><tbody>${invoice.items.map(item => `<tr><td>${item.menuItemName}${item.note ? `<br><small>${item.note}</small>` : ''}</td><td>${item.quantity}</td><td class="right">${money(item.unitPrice)}</td><td class="right">${money(item.totalPrice)}</td></tr>`).join('')}</tbody></table><p>Tổng tiền: <strong>${money(invoice.totalAmount)}</strong></p><p>Giảm giá: -${money(invoice.discountAmount)}</p><p>Phí phục vụ: +${money(invoice.serviceChargeAmount)}</p><p>VAT: +${money(invoice.vatAmount)}</p><p class="total">Thanh toán: ${money(invoice.finalAmount)}</p><p>Khách đưa: ${money(invoice.customerPaid)} — Tiền thối: ${money(invoice.changeAmount)}</p>${invoice.note ? `<p class="note">Ghi chú: ${invoice.note}</p>` : ''}<button onclick="window.print()">In hóa đơn</button><script>window.onload=()=>window.print()</script></body></html>`)
    popup.document.close()
  }

  return <section className="invoices-page">
    <div className="page-toolbar"><div><h2>Quản lý hóa đơn</h2><p>Tra cứu, phát hành, in và quản lý hóa đơn thanh toán.</p></div><button className="primary-button" onClick={openCreate}>+ Tạo hóa đơn</button></div>

    <div className="invoice-summary">
      <article><span>Tổng phù hợp</span><strong>{totalCount}</strong></article>
      <article><span>Đã phát hành trên trang</span><strong>{summary.issued}</strong></article>
      <article><span>Đã in trên trang</span><strong>{summary.printed}</strong></article>
      <article><span>Giá trị trên trang</span><strong>{money(summary.amount)}</strong></article>
    </div>

    {message && <div className="inline-alert success">{message}</div>}
    {error && <div className="inline-alert error">{error}</div>}

    <form className="invoice-filters" onSubmit={event => { event.preventDefault(); void loadInvoices(1) }}>
      <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm mã hóa đơn, đơn, thanh toán hoặc bàn..." />
      <select value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option><option value="Issued">Đã phát hành</option><option value="Printed">Đã in</option><option value="Cancelled">Đã hủy</option></select>
      <select value={method} onChange={event => setMethod(event.target.value)}><option value="">Tất cả phương thức</option>{methods.map(value => <option key={value} value={value}>{methodLabels[value]}</option>)}</select>
      <button type="submit">Lọc</button>
    </form>

    <div className="invoice-table-wrap"><table className="invoice-table"><thead><tr><th>Mã hóa đơn</th><th>Đơn/Bàn</th><th>Phương thức</th><th>Ngày phát hành</th><th>Giá trị</th><th>Trạng thái</th><th></th></tr></thead><tbody>
      {loading ? <tr><td colSpan={7}>Đang tải...</td></tr> : invoices.length === 0 ? <tr><td colSpan={7}>Không có hóa đơn phù hợp.</td></tr> : invoices.map(invoice => <tr key={invoice.id}>
        <td><strong>{invoice.invoiceCode}</strong><small>{invoice.paymentCode}</small></td>
        <td><strong>{invoice.orderCode}</strong><small>{invoice.restaurantTableName}</small></td>
        <td>{methodLabels[invoice.paymentMethod] ?? invoice.paymentMethod}</td>
        <td>{new Date(invoice.issuedAt).toLocaleString('vi-VN')}</td>
        <td><strong>{money(invoice.finalAmount)}</strong><small>Thối {money(invoice.changeAmount)}</small></td>
        <td><span className={`invoice-status ${invoice.status.toLowerCase()}`}>{statusLabels[invoice.status] ?? invoice.status}</span></td>
        <td><div className="invoice-actions"><button onClick={() => void openDetail(invoice)}>Chi tiết</button><button disabled={invoice.status === 'Cancelled'} onClick={() => openEdit(invoice)}>Sửa</button><button disabled={invoice.status === 'Cancelled'} onClick={() => void markPrinted(invoice)}>Đã in</button><button className="danger" disabled={invoice.status === 'Cancelled'} onClick={() => void remove(invoice)}>Hủy</button></div></td>
      </tr>)}</tbody></table></div>

    <div className="pagination"><span>Trang {page}/{totalPages} • {totalCount} hóa đơn</span><div><button disabled={page <= 1 || loading} onClick={() => void loadInvoices(page - 1)}>Trước</button><button disabled={page >= totalPages || loading} onClick={() => void loadInvoices(page + 1)}>Sau</button></div></div>

    {detail && <div className="modal-backdrop" onMouseDown={() => setDetail(null)}><div className="invoice-detail-modal" onMouseDown={event => event.stopPropagation()}><div className="modal-heading"><div><h2>{detail.invoiceCode}</h2><p>{detail.orderCode} • {detail.restaurantTableName}</p></div><button onClick={() => setDetail(null)}>×</button></div><div className="invoice-paper"><div className="invoice-meta"><span>Thanh toán: <strong>{detail.paymentCode}</strong></span><span>Ngày: {new Date(detail.issuedAt).toLocaleString('vi-VN')}</span><span>Phương thức: {methodLabels[detail.paymentMethod] ?? detail.paymentMethod}</span><span>Trạng thái: {statusLabels[detail.status] ?? detail.status}</span></div><table><thead><tr><th>Món</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead><tbody>{detail.items.map(item => <tr key={item.id}><td><strong>{item.menuItemName}</strong>{item.note && <small>{item.note}</small>}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.totalPrice)}</td></tr>)}</tbody></table><div className="invoice-totals"><span>Tổng tiền <strong>{money(detail.totalAmount)}</strong></span><span>Giảm giá <strong>-{money(detail.discountAmount)}</strong></span><span>Phí phục vụ <strong>+{money(detail.serviceChargeAmount)}</strong></span><span>VAT <strong>+{money(detail.vatAmount)}</strong></span><span className="final">Thanh toán <strong>{money(detail.finalAmount)}</strong></span><span>Khách đưa <strong>{money(detail.customerPaid)}</strong></span><span>Tiền thối <strong>{money(detail.changeAmount)}</strong></span></div>{detail.note && <p className="invoice-note">Ghi chú: {detail.note}</p>}</div><div className="modal-actions"><button onClick={() => setDetail(null)}>Đóng</button><button onClick={() => printInvoice(detail)}>In hóa đơn</button><button className="primary-button" disabled={detail.status === 'Cancelled'} onClick={() => void markPrinted(detail)}>Đánh dấu đã in</button></div></div></div>}

    {createOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setCreateOpen(false)}><div className="employee-modal invoice-form-modal" onMouseDown={event => event.stopPropagation()}><div className="modal-heading"><div><h2>Tạo hóa đơn</h2><p>Chọn thanh toán Paid chưa có hóa đơn hiệu lực.</p></div><button onClick={() => setCreateOpen(false)}>×</button></div><form className="invoice-form" onSubmit={submitCreate}><label>Thanh toán<select required value={paymentId} onChange={event => setPaymentId(event.target.value)}><option value="">Chọn thanh toán</option>{payments.map(payment => <option key={payment.id} value={payment.id}>{payment.paymentCode} • {money(payment.finalAmount)}</option>)}</select></label><label>Ghi chú<textarea value={note} onChange={event => setNote(event.target.value)} /></label><div className="modal-actions"><button type="button" onClick={() => setCreateOpen(false)}>Đóng</button><button className="primary-button" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo hóa đơn'}</button></div></form></div></div>}

    {editOpen && detail && <div className="modal-backdrop" onMouseDown={() => !saving && setEditOpen(false)}><div className="employee-modal invoice-form-modal" onMouseDown={event => event.stopPropagation()}><div className="modal-heading"><div><h2>Cập nhật hóa đơn</h2><p>{detail.invoiceCode}</p></div><button onClick={() => setEditOpen(false)}>×</button></div><form className="invoice-form" onSubmit={submitEdit}><label>Ghi chú<textarea value={note} onChange={event => setNote(event.target.value)} /></label><div className="modal-actions"><button type="button" onClick={() => setEditOpen(false)}>Đóng</button><button className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Cập nhật'}</button></div></form></div></div>}
  </section>
}
