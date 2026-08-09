import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { getOrders, type Order } from '../api/orders'
import {
  getRestaurantSettings,
  type RestaurantSetting,
} from '../api/restaurantSettings'
import {
  cancelPayment,
  createPayment,
  getPayments,
  updatePayment,
  type CreatePaymentForm,
  type Payment,
} from '../api/payments'

const methods = ['Cash', 'BankTransfer', 'Card', 'EWallet']
const methodLabels: Record<string, string> = {
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản',
  Card: 'Thẻ',
  EWallet: 'Ví điện tử',
}
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
const percent = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)

function calculateConfiguredCharges(
  totalAmount: number,
  discountAmount: number,
  setting: RestaurantSetting | null,
) {
  const discountedSubtotal = Math.max(0, totalAmount - discountAmount)
  const serviceChargeAmount = Math.round(
    discountedSubtotal * (setting?.serviceChargePercent ?? 0) / 100,
  )
  const vatAmount = Math.round(
    (discountedSubtotal + serviceChargeAmount)
      * (setting?.defaultVatPercent ?? 0) / 100,
  )

  return { serviceChargeAmount, vatAmount }
}

const emptyForm: CreatePaymentForm = {
  orderId: '', discountAmount: 0, serviceChargeAmount: 0, vatAmount: 0, customerPaid: 0,
  paymentMethod: 'Cash', note: '', issueInvoice: true,
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([])
  const [activeSetting, setActiveSetting] = useState<RestaurantSetting | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState({
    paid: 0,
    cancelled: 0,
    revenue: 0,
  })
  const latestPaymentRequest = useRef(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [form, setForm] = useState<CreatePaymentForm>(emptyForm)

  async function loadPayments(targetPage = page) {
    const requestId = ++latestPaymentRequest.current
    setLoading(true); setError('')
    try {
      const result = await getPayments(keyword, status, method, targetPage, 10)
      if (requestId !== latestPaymentRequest.current) return

      setPayments(result.items ?? [])
      setPage(result.pageNumber ?? targetPage)
      setTotalPages(Math.max(1, result.totalPages ?? 1))
      setTotalCount(result.totalCount ?? 0)
      setSummary({
        paid: result.paidCount ?? 0,
        cancelled: result.cancelledCount ?? 0,
        revenue: result.revenue ?? 0,
      })
    } catch (exception) {
      if (requestId !== latestPaymentRequest.current) return
      setError(exception instanceof Error ? exception.message : 'Không tải được danh sách thanh toán.')
    } finally {
      if (requestId === latestPaymentRequest.current) setLoading(false)
    }
  }

  async function loadEligibleOrders() {
    try {
      const result = await getOrders('', '', 'Served', 1, 100)
      setEligibleOrders(result.items ?? [])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được đơn chờ thanh toán.')
    }
  }

  async function loadActiveSetting() {
    setSettingsLoading(true)
    try {
      const settings = await getRestaurantSettings('true')
      setActiveSetting(settings[0] ?? null)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được cấu hình VAT và phí phục vụ.')
    } finally {
      setSettingsLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([loadPayments(1), loadEligibleOrders(), loadActiveSetting()])
  }, [])

  const selectedOrder = useMemo(
    () => eligibleOrders.find(order => order.id === form.orderId) ?? null,
    [eligibleOrders, form.orderId],
  )
  const preview = useMemo(() => {
    const total = editing?.totalAmount ?? selectedOrder?.totalAmount ?? 0
    const final = Math.max(
      0,
      total - Number(form.discountAmount || 0)
        + Number(form.serviceChargeAmount || 0)
        + Number(form.vatAmount || 0),
    )
    return { total, final, change: Math.max(0, Number(form.customerPaid || 0) - final) }
  }, [
    editing,
    selectedOrder,
    form.discountAmount,
    form.serviceChargeAmount,
    form.vatAmount,
    form.customerPaid,
  ])

  function changeOrder(orderId: string) {
    const order = eligibleOrders.find(item => item.id === orderId)
    const totalAmount = order?.totalAmount ?? 0
    const charges = calculateConfiguredCharges(totalAmount, 0, activeSetting)
    const finalAmount = totalAmount
      + charges.serviceChargeAmount
      + charges.vatAmount

    setForm(current => ({
      ...current,
      orderId,
      discountAmount: 0,
      ...charges,
      customerPaid: finalAmount,
    }))
  }

  function changeDiscount(discountAmount: number) {
    if (editing) {
      setForm(current => ({ ...current, discountAmount }))
      return
    }

    const charges = calculateConfiguredCharges(
      selectedOrder?.totalAmount ?? 0,
      discountAmount,
      activeSetting,
    )
    const finalAmount = Math.max(
      0,
      (selectedOrder?.totalAmount ?? 0) - discountAmount
        + charges.serviceChargeAmount
        + charges.vatAmount,
    )

    setForm(current => ({
      ...current,
      discountAmount,
      ...charges,
      customerPaid: finalAmount,
    }))
  }

  function openCreate() {
    setEditing(null); setForm(emptyForm); setMessage(''); setError(''); setModalOpen(true)
  }

  function openEdit(payment: Payment) {
    setEditing(payment)
    setForm({
      orderId: payment.orderId,
      discountAmount: payment.discountAmount,
      serviceChargeAmount: payment.serviceChargeAmount,
      vatAmount: payment.vatAmount,
      customerPaid: payment.customerPaid,
      paymentMethod: payment.paymentMethod,
      note: payment.note ?? '',
      issueInvoice: false,
    })
    setMessage(''); setError(''); setModalOpen(true)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!editing && !form.orderId) { setError('Vui lòng chọn đơn hàng.'); return }
    if (preview.final <= 0) { setError('Số tiền thanh toán phải lớn hơn 0.'); return }
    if (form.customerPaid < preview.final) { setError('Số tiền khách đưa chưa đủ.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const result = editing
        ? await updatePayment(editing.id, {
            discountAmount: form.discountAmount,
            serviceChargeAmount: form.serviceChargeAmount,
            vatAmount: form.vatAmount,
            customerPaid: form.customerPaid,
            paymentMethod: form.paymentMethod,
            note: form.note,
          })
        : await createPayment(form)
      setMessage(result.message ?? 'Lưu thanh toán thành công.')
      setModalOpen(false)
      await Promise.all([loadPayments(1), loadEligibleOrders()])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không lưu được thanh toán.')
    } finally { setSaving(false) }
  }

  async function remove(payment: Payment) {
    if (!await confirmAction(`Hủy thanh toán ${payment.paymentCode}?`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await cancelPayment(payment.id)
      setMessage(result.message ?? 'Hủy thanh toán thành công.')
      await Promise.all([loadPayments(page), loadEligibleOrders()])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không hủy được thanh toán.')
    } finally { setSaving(false) }
  }

  return <section className="payments-page">
    <div className="page-toolbar"><div><h2>Quản lý thanh toán</h2><p>Thu tiền, áp dụng giảm giá, phí phục vụ, VAT và xuất hóa đơn theo đơn hàng.</p></div><button className="primary-button" disabled={settingsLoading} onClick={openCreate}>+ Thanh toán mới</button></div>

    <div className="payment-summary">
      <article><span>Tổng phù hợp</span><strong>{totalCount}</strong></article>
      <article><span>Đã thanh toán</span><strong>{summary.paid}</strong></article>
      <article><span>Đã hủy</span><strong>{summary.cancelled}</strong></article>
      <article><span>Doanh thu</span><strong>{money(summary.revenue)}</strong></article>
    </div>

    {message && <div className="inline-alert success">{message}</div>}
    {error && <div className="inline-alert error">{error}</div>}

    <form className="payment-filters" onSubmit={event => { event.preventDefault(); void loadPayments(1) }}>
      <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm mã thanh toán, phương thức..." />
      <select value={status} onChange={event => setStatus(event.target.value)}><option value="">Tất cả trạng thái</option><option value="Paid">Đã thanh toán</option><option value="Cancelled">Đã hủy</option></select>
      <select value={method} onChange={event => setMethod(event.target.value)}><option value="">Tất cả phương thức</option>{methods.map(value => <option key={value} value={value}>{methodLabels[value]}</option>)}</select>
      <button type="submit">Lọc</button>
    </form>

    <div className="payment-table-wrap"><table className="payment-table"><thead><tr><th>Mã</th><th>Thời gian</th><th>Phương thức</th><th>Tổng</th><th>Giảm/Phí/VAT</th><th>Thực thu</th><th>Trạng thái</th><th></th></tr></thead><tbody>
      {loading ? <tr><td colSpan={8}>Đang tải...</td></tr> : payments.length === 0 ? <tr><td colSpan={8}>Không có thanh toán phù hợp.</td></tr> : payments.map(payment => <tr key={payment.id}>
        <td><strong>{payment.paymentCode}</strong><small>{payment.note || 'Không ghi chú'}</small></td>
        <td>{new Date(payment.paidAt).toLocaleString('vi-VN')}</td>
        <td>{methodLabels[payment.paymentMethod] ?? payment.paymentMethod}</td>
        <td>{money(payment.totalAmount)}</td>
        <td><span>-{money(payment.discountAmount)}</span><small>Phí +{money(payment.serviceChargeAmount)}</small><small>VAT +{money(payment.vatAmount)}</small></td>
        <td><strong>{money(payment.finalAmount)}</strong><small>Thối {money(payment.changeAmount)}</small></td>
        <td><span className={`payment-status ${payment.status.toLowerCase()}`}>{payment.status === 'Paid' ? 'Đã thanh toán' : 'Đã hủy'}</span></td>
        <td><div className="payment-actions"><button disabled={saving || payment.status === 'Cancelled'} onClick={() => openEdit(payment)}>Sửa</button><button className="danger" disabled={saving || payment.status === 'Cancelled'} onClick={() => void remove(payment)}>Hủy</button></div></td>
      </tr>)}</tbody></table></div>

    <div className="pagination"><span>Trang {page}/{totalPages} • {totalCount} thanh toán</span><div><button disabled={page <= 1 || loading} onClick={() => void loadPayments(page - 1)}>Trước</button><button disabled={page >= totalPages || loading} onClick={() => void loadPayments(page + 1)}>Sau</button></div></div>

    {modalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}><div className="employee-modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" onMouseDown={event => event.stopPropagation()}><div className="modal-heading"><div><span className="modal-kicker">{editing ? 'CẬP NHẬT GIAO DỊCH' : 'THANH TOÁN'}</span><h2 id="payment-modal-title">{editing ? 'Cập nhật thanh toán' : 'Thanh toán đơn hàng'}</h2><p>{editing ? editing.paymentCode : 'Kiểm tra số tiền và phương thức trước khi xác nhận.'}</p></div><button type="button" aria-label="Đóng" onClick={() => setModalOpen(false)}>×</button></div>
      <form id="payment-form" className="payment-form" onSubmit={submit}>
        {error && <div className="modal-alert error" role="alert">{error}</div>}
        {!editing && <label>Đơn hàng<select required value={form.orderId} onChange={event => changeOrder(event.target.value)}><option value="">Chọn đơn chờ thanh toán</option>{eligibleOrders.map(order => <option key={order.id} value={order.id}>{order.orderCode} • {order.restaurantTableName} • {money(order.totalAmount)}</option>)}</select></label>}
        <div className="payment-form-grid"><label>Giảm giá<input type="number" min={0} max={preview.total} value={form.discountAmount} onChange={event => changeDiscount(Number(event.target.value))}/></label><label>Phí phục vụ{!editing && activeSetting ? ` (${percent(activeSetting.serviceChargePercent)}%)` : ''}<input type="number" min={0} value={form.serviceChargeAmount} onChange={event => setForm({...form,serviceChargeAmount:Number(event.target.value)})}/></label><label>VAT{!editing && activeSetting ? ` (${percent(activeSetting.defaultVatPercent)}%)` : ''}<input type="number" min={0} value={form.vatAmount} onChange={event => setForm({...form,vatAmount:Number(event.target.value)})}/></label><label>Khách đưa<input type="number" min={0} value={form.customerPaid} onChange={event => setForm({...form,customerPaid:Number(event.target.value)})}/></label><label>Phương thức<select value={form.paymentMethod} onChange={event => setForm({...form,paymentMethod:event.target.value})}>{methods.map(value => <option key={value} value={value}>{methodLabels[value]}</option>)}</select></label></div>
        <label>Ghi chú<textarea value={form.note} onChange={event => setForm({...form,note:event.target.value})}/></label>
        {!editing && <label className="invoice-toggle"><input type="checkbox" checked={form.issueInvoice} onChange={event => setForm({...form,issueInvoice:event.target.checked})}/> Tự động xuất hóa đơn sau thanh toán</label>}
        <div className="payment-preview"><div><span>Tiền món</span><strong>{money(preview.total)}</strong></div><div><span>Giảm giá</span><strong>-{money(form.discountAmount)}</strong></div><div><span>Phí phục vụ</span><strong>+{money(form.serviceChargeAmount)}</strong></div><div><span>VAT</span><strong>+{money(form.vatAmount)}</strong></div><div className="final"><span>Khách cần trả</span><strong>{money(preview.final)}</strong></div><div><span>Tiền thối</span><strong>{money(preview.change)}</strong></div></div>
      </form>
      <div className="modal-actions modal-footer"><button type="button" onClick={() => setModalOpen(false)}>Đóng</button><button type="submit" form="payment-form" className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Xác nhận thanh toán'}</button></div>
    </div></div>}
  </section>
}
