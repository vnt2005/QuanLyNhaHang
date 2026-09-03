import { useAutoDismissMessage } from '../hooks/useAutoDismissMessage'
import { confirmAction } from '../components/ConfirmDialog'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { getOrders, type Order } from '../services/orders'
import {
  applyPromotion,
  cancelPromotionUsage,
  getAppliedPromotionUsages,
  type PromotionUsage,
} from '../services/promotions'
import {
  getRestaurantSettings,
  type RestaurantSetting,
} from '../services/restaurantSettings'
import {
  cancelPayment,
  createPayment,
  getPayments,
  updatePayment,
  type CreatePaymentForm,
  type Payment,
} from '../services/payments'
import { calculateConfiguredCharges } from '../utils/paymentCalculations'
import {
  ADMIN_NOTIFICATION_EVENT,
  type AdminNotification,
} from '../services/notifications'

const methods = [
  'BankTransfer',
  'Cash',
  'Card',
  'EWallet',
  'Momo',
  'ZaloPay',
  'Other',
]
const counterMethods = methods.filter(value => value !== 'BankTransfer')
const methodLabels: Record<string, string> = {
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản QR/ngân hàng',
  Card: 'Thẻ',
  EWallet: 'Ví điện tử',
  Momo: 'MoMo',
  ZaloPay: 'ZaloPay',
  Other: 'Khác',
}

function paidAmountLabel(paymentMethod: string) {
  if (paymentMethod === 'Cash') return 'Khách đưa'
  if (paymentMethod === 'Card') return 'Đã thanh toán thẻ'
  return 'Số tiền đã nhận'
}

function isSettledOnlinePayment(payment: Payment) {
  return payment.paymentMethod === 'BankTransfer'
    && Boolean(payment.note?.includes('SePay | transactionId='))
}

function isLockedPayment(payment: Payment) {
  return payment.status === 'Paid'
}

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
const percent = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)

const emptyForm: CreatePaymentForm = {
  orderId: '', discountAmount: 0, serviceChargeAmount: 0, vatAmount: 0, customerPaid: 0,
  paymentMethod: 'Cash', note: '', issueInvoice: true,
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [eligibleOrders, setEligibleOrders] = useState<Order[]>([])
  const [activeSetting, setActiveSetting] = useState<RestaurantSetting | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [appliedPromotionUsages, setAppliedPromotionUsages] = useState<PromotionUsage[]>([])
  const [promotionUsagesLoading, setPromotionUsagesLoading] = useState(true)
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
  const realtimeRefreshRef = useRef<() => void>(() => undefined)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [form, setForm] = useState<CreatePaymentForm>(emptyForm)
  const [checkoutPromotionCode, setCheckoutPromotionCode] = useState('')
  const [promotionApplying, setPromotionApplying] = useState(false)
  const [promotionError, setPromotionError] = useState('')

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
      // Backend coi Served + OnlyUnpaid là danh sách thu tiền tại quầy và
      // đồng thời đưa Takeaway Ready chưa Paid vào đây theo nghiệp vụ mới.
      const result = await getOrders('', '', 'Served', 1, 100, true)
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

  async function loadAppliedPromotionUsages() {
    setPromotionUsagesLoading(true)
    try {
      setAppliedPromotionUsages(await getAppliedPromotionUsages())
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được khuyến mãi đã áp dụng.')
    } finally {
      setPromotionUsagesLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([
      loadPayments(1),
      loadEligibleOrders(),
      loadActiveSetting(),
      loadAppliedPromotionUsages(),
    ])
  }, [])

  realtimeRefreshRef.current = () => {
    void Promise.all([loadPayments(page), loadEligibleOrders()])
  }

  useEffect(() => {
    const refreshPayments = (event: Event) => {
      const notification = (event as CustomEvent<AdminNotification>).detail
      if (!notification?.type.startsWith('Payment.')) return
      realtimeRefreshRef.current()
    }

    window.addEventListener(ADMIN_NOTIFICATION_EVENT, refreshPayments)
    return () => {
      window.removeEventListener(ADMIN_NOTIFICATION_EVENT, refreshPayments)
    }
  }, [])

  const selectedOrder = useMemo(
    () => eligibleOrders.find(order => order.id === form.orderId) ?? null,
    [eligibleOrders, form.orderId],
  )
  const selectedPromotionUsage = useMemo(
    () => appliedPromotionUsages.find(usage => usage.orderId === form.orderId) ?? null,
    [appliedPromotionUsages, form.orderId],
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
    const promotionUsage = appliedPromotionUsages.find(
      usage => usage.orderId === orderId,
    )
    const totalAmount = order?.totalAmount ?? 0
    const discountAmount = promotionUsage?.discountAmount ?? 0
    const charges = calculateConfiguredCharges(
      totalAmount,
      discountAmount,
      activeSetting,
      order?.orderType ?? 'DineIn',
    )
    const finalAmount = Math.max(
      0,
      totalAmount - discountAmount
        + charges.serviceChargeAmount
        + charges.vatAmount,
    )

    setCheckoutPromotionCode(promotionUsage?.promotionCode ?? '')
    setPromotionError('')
    setForm(current => ({
      ...current,
      orderId,
      discountAmount,
      ...charges,
      customerPaid: finalAmount,
      issueInvoice: true,
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
      selectedOrder?.orderType ?? 'DineIn',
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

  function changePaymentMethod(paymentMethod: string) {
    setForm(current => ({
      ...current,
      paymentMethod,
      customerPaid: paymentMethod === 'Cash' ? current.customerPaid : preview.final,
    }))
  }

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setCheckoutPromotionCode('')
    setPromotionError('')
    setMessage('')
    setError('')
    setModalOpen(true)
  }

  function openEdit(payment: Payment) {
    if (isLockedPayment(payment)) {
      setError('Thanh toán đã Paid và đã chốt vào hóa đơn/báo cáo nên không thể sửa số tiền hoặc phương thức.')
      return
    }

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
    setCheckoutPromotionCode('')
    setPromotionError('')
    setMessage('')
    setError('')
    setModalOpen(true)
  }

  async function applyCheckoutPromotion() {
    if (!form.orderId) {
      setPromotionError('Vui lòng chọn đơn hàng trước khi áp mã.')
      return
    }

    const promotionCode = checkoutPromotionCode.trim()
    if (!promotionCode) {
      setPromotionError('Vui lòng nhập mã khuyến mãi.')
      return
    }

    setPromotionApplying(true)
    setPromotionError('')
    try {
      const result = await applyPromotion(
        form.orderId,
        promotionCode,
        'Áp dụng tại màn hình thanh toán',
      )
      changeDiscount(result.data.discountAmount)
      setCheckoutPromotionCode(result.data.promotionCode)
      await loadAppliedPromotionUsages()
    } catch (exception) {
      setPromotionError(
        exception instanceof Error
          ? exception.message
          : 'Không áp dụng được mã khuyến mãi.',
      )
    } finally {
      setPromotionApplying(false)
    }
  }

  async function removeCheckoutPromotion() {
    if (!selectedPromotionUsage) return

    setPromotionApplying(true)
    setPromotionError('')
    try {
      await cancelPromotionUsage(selectedPromotionUsage.id)
      changeDiscount(0)
      setCheckoutPromotionCode('')
      await loadAppliedPromotionUsages()
    } catch (exception) {
      setPromotionError(
        exception instanceof Error
          ? exception.message
          : 'Không gỡ được mã khuyến mãi.',
      )
    } finally {
      setPromotionApplying(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (promotionApplying) { setError('Vui lòng chờ xử lý mã khuyến mãi.'); return }
    if (!editing && !form.orderId) { setError('Vui lòng chọn đơn hàng.'); return }
    if (!editing && form.paymentMethod === 'BankTransfer') { setError('Chuyển khoản QR/ngân hàng chỉ được ghi nhận tự động sau khi SePay xác minh giao dịch.'); return }
    if (!editing && !form.note.trim()) { setError('Vui lòng nhập lý do hoặc thông tin đối chiếu cho thanh toán tại quầy.'); return }
    if (preview.final <= 0) { setError('Số tiền thanh toán phải lớn hơn 0.'); return }
    if (form.customerPaid < preview.final) { setError(`${paidAmountLabel(form.paymentMethod)} chưa đủ.`); return }
    if (!editing && form.paymentMethod !== 'Cash' && form.customerPaid !== preview.final) { setError('Phương thức không dùng tiền mặt phải ghi nhận đúng số tiền cần thanh toán.'); return }
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
      await Promise.all([
        loadPayments(1),
        loadEligibleOrders(),
        loadAppliedPromotionUsages(),
      ])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không lưu được thanh toán.')
    } finally { setSaving(false) }
  }

  async function remove(payment: Payment) {
    if (isLockedPayment(payment)) {
      setError('Thanh toán đã Paid nên không thể hủy trực tiếp. Cần xử lý hoàn tiền/đối soát riêng.')
      return
    }

    if (!await confirmAction(`Hủy thanh toán ${payment.paymentCode}?`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await cancelPayment(payment.id)
      setMessage(result.message ?? 'Hủy thanh toán thành công.')
      await Promise.all([
        loadPayments(page),
        loadEligibleOrders(),
        loadAppliedPromotionUsages(),
      ])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không hủy được thanh toán.')
    } finally { setSaving(false) }
  }

  return <section className="payments-page">
    <div className="page-toolbar"><div><h2>Quản lý thanh toán</h2><p>Thu tiền tại quầy bằng phương thức hợp lệ. Chuyển khoản QR/ngân hàng chỉ được ghi nhận từ giao dịch SePay đã xác minh.</p></div><button className="primary-button" disabled={settingsLoading || promotionUsagesLoading} onClick={openCreate}>+ Thanh toán mới</button></div>

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
        <td>{methodLabels[payment.paymentMethod] ?? payment.paymentMethod}{isSettledOnlinePayment(payment) ? <small>SePay • đã đối soát</small> : null}</td>
        <td>{money(payment.totalAmount)}</td>
        <td><span>-{money(payment.discountAmount)}</span><small>Phí +{money(payment.serviceChargeAmount)}</small><small>VAT +{money(payment.vatAmount)}</small></td>
        <td><strong>{money(payment.finalAmount)}</strong><small>{payment.paymentMethod === 'Cash' ? `Thối ${money(payment.changeAmount)}` : methodLabels[payment.paymentMethod] ?? payment.paymentMethod}</small></td>
        <td><span className={`payment-status ${payment.status.toLowerCase()}`}>{payment.status === 'Paid' ? 'Đã thanh toán' : 'Đã hủy'}</span></td>
        <td><div className="payment-actions"><button disabled={saving || payment.status === 'Cancelled' || isLockedPayment(payment)} title={isLockedPayment(payment) ? 'Thanh toán Paid đã được khóa để bảo toàn hóa đơn và báo cáo.' : undefined} onClick={() => openEdit(payment)}>Sửa</button><button className="danger" disabled={saving || payment.status === 'Cancelled' || isLockedPayment(payment)} title={isLockedPayment(payment) ? 'Không thể hủy trực tiếp thanh toán đã Paid.' : undefined} onClick={() => void remove(payment)}>Hủy</button></div></td>
      </tr>)}</tbody></table></div>

    <div className="pagination"><span>Trang {page}/{totalPages} • {totalCount} thanh toán</span><div><button disabled={page <= 1 || loading} onClick={() => void loadPayments(page - 1)}>Trước</button><button disabled={page >= totalPages || loading} onClick={() => void loadPayments(page + 1)}>Sau</button></div></div>

    {modalOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}><div className="employee-modal payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" onMouseDown={event => event.stopPropagation()}><div className="modal-heading"><div><span className="modal-kicker">{editing ? 'CẬP NHẬT GIAO DỊCH' : 'THANH TOÁN TẠI QUẦY'}</span><h2 id="payment-modal-title">{editing ? 'Cập nhật thanh toán' : 'Thanh toán đơn hàng'}</h2><p>{editing ? editing.paymentCode : 'Chỉ ghi nhận tiền thực tế đã nhận tại quầy. Chuyển khoản QR/ngân hàng do SePay xác minh tự động.'}</p></div><button type="button" aria-label="Đóng" onClick={() => setModalOpen(false)}>×</button></div>
      <form id="payment-form" className="payment-form" onSubmit={submit}>
        {error && <div className="modal-alert error" role="alert">{error}</div>}
        {!editing && <label>Đơn hàng<select required value={form.orderId} onChange={event => changeOrder(event.target.value)}><option value="">Chọn đơn chờ thanh toán</option>{eligibleOrders.map(order => <option key={order.id} value={order.id}>{order.orderCode} • {order.orderType === 'Takeaway' ? `Mang về${order.customerName ? ` - ${order.customerName}` : ''}` : order.restaurantTableName} • {money(order.totalAmount)}</option>)}</select></label>}
        {!editing && <div className="payment-promotion-controls"><label>Mã khuyến mãi<input value={checkoutPromotionCode} readOnly={Boolean(selectedPromotionUsage)} placeholder="Nhập mã khách cung cấp" autoComplete="off" onChange={event => { setCheckoutPromotionCode(event.target.value.toUpperCase()); setPromotionError('') }} onKeyDown={event => { if (event.key === 'Enter' && !selectedPromotionUsage) { event.preventDefault(); void applyCheckoutPromotion() } }}/></label>{selectedPromotionUsage ? <button type="button" className="remove-promotion-button" disabled={promotionApplying} onClick={() => void removeCheckoutPromotion()}>{promotionApplying ? 'Đang gỡ...' : 'Gỡ mã'}</button> : <button type="button" className="primary-button" disabled={promotionApplying || !form.orderId || !checkoutPromotionCode.trim()} onClick={() => void applyCheckoutPromotion()}>{promotionApplying ? 'Đang áp dụng...' : 'Áp dụng'}</button>}{promotionError ? <small className="payment-promotion-message error" role="alert">{promotionError}</small> : selectedPromotionUsage ? <small className="payment-promotion-message success">Đã áp dụng mã {selectedPromotionUsage.promotionCode}, giảm {money(selectedPromotionUsage.discountAmount)}.</small> : <small className="payment-promotion-message">Nhập mã khách cung cấp; backend sẽ tính và xác minh lại toàn bộ số tiền trước khi ghi nhận Paid.</small>}</div>}
        <div className="payment-form-grid"><label>Giảm giá<input type="number" aria-label="Giảm giá" min={0} max={preview.total} value={form.discountAmount} readOnly={!editing} aria-describedby={!editing && selectedPromotionUsage ? 'applied-promotion-note' : undefined} onChange={event => changeDiscount(Number(event.target.value))}/>{!editing && selectedPromotionUsage ? <small id="applied-promotion-note">Mã {selectedPromotionUsage.promotionCode} đã được tự động áp dụng.</small> : null}</label><label>Phí phục vụ{!editing && selectedOrder?.orderType === 'Takeaway' ? ' (không áp dụng cho mang về)' : !editing && activeSetting ? ` (${percent(activeSetting.serviceChargePercent)}%)` : ''}<input type="number" min={0} value={form.serviceChargeAmount} readOnly={!editing} onChange={event => setForm({...form,serviceChargeAmount:Number(event.target.value)})}/></label><label>VAT{!editing && activeSetting ? ` (${percent(activeSetting.defaultVatPercent)}%)` : ''}<input type="number" min={0} value={form.vatAmount} readOnly={!editing} onChange={event => setForm({...form,vatAmount:Number(event.target.value)})}/></label><label>{paidAmountLabel(form.paymentMethod)}<input type="number" min={0} value={form.customerPaid} readOnly={!editing && form.paymentMethod !== 'Cash'} onChange={event => setForm({...form,customerPaid:Number(event.target.value)})}/></label><label>Phương thức<select value={form.paymentMethod} onChange={event => changePaymentMethod(event.target.value)}>{(editing ? methods : counterMethods).map(value => <option key={value} value={value}>{methodLabels[value]}</option>)}</select></label></div>
        <label>{editing ? 'Ghi chú' : 'Lý do / thông tin đối chiếu'}<textarea required={!editing} value={form.note} placeholder={!editing ? 'Ví dụ: Thu tiền mặt tại quầy; khách thanh toán trực tiếp cho thu ngân.' : undefined} onChange={event => setForm({...form,note:event.target.value})}/></label>
        {!editing && <p className="invoice-toggle">Hóa đơn được phát hành tự động sau khi backend xác minh số tiền. Giao dịch QR/ngân hàng chỉ chuyển sang Paid từ payment attempt + webhook SePay hợp lệ.</p>}
        <div className="payment-preview"><div><span>Tiền món</span><strong>{money(preview.total)}</strong></div>{!editing && selectedPromotionUsage ? <div><span>Khuyến mãi</span><strong>{selectedPromotionUsage.promotionCode}</strong></div> : null}<div><span>Giảm giá</span><strong>-{money(form.discountAmount)}</strong></div><div><span>Phí phục vụ</span><strong>+{money(form.serviceChargeAmount)}</strong></div><div><span>VAT</span><strong>+{money(form.vatAmount)}</strong></div><div className="final"><span>Khách cần trả</span><strong>{money(preview.final)}</strong></div><div><span>{form.paymentMethod === 'Cash' ? 'Tiền thối' : 'Chênh lệch'}</span><strong>{money(preview.change)}</strong></div></div>
      </form>
      <div className="modal-actions modal-footer"><button type="button" onClick={() => setModalOpen(false)}>Đóng</button><button type="submit" form="payment-form" className="primary-button" disabled={saving || promotionApplying}>{saving ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Xác nhận đã thu tại quầy'}</button></div>
    </div></div>}
  </section>
}
