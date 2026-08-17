import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { getSelectableTables, getTables, type RestaurantTable } from '../api/areasTables'
import { getMenuItems, type MenuItem } from '../api/menu'
import {
  addOrderItem,
  cancelOrderItem,
  changeOrderStatus,
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  updateOrderItemQuantity,
  updateOrderNote,
  type CreateOrderForm,
  type CreateOrderLine,
  type Order,
  type OrderStatus,
} from '../api/orders'

const statuses: { value: OrderStatus; label: string }[] = [
  { value: 'Pending', label: 'Chờ xử lý' },
  { value: 'Cooking', label: 'Đang nấu' },
  { value: 'Ready', label: 'Sẵn sàng' },
  { value: 'Served', label: 'Đã phục vụ / giao' },
  { value: 'Completed', label: 'Hoàn tất' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

const emptyForm: CreateOrderForm = {
  restaurantTableId: '',
  note: '',
  items: [{ menuItemId: '', quantity: 1, note: '' }],
}
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)

function orderContext(order: Order) {
  if (order.orderType !== 'Takeaway') return order.restaurantTableName
  const parts = ['Mang về']
  if (order.customerName) parts.push(order.customerName)
  if (order.customerPhoneNumber) parts.push(order.customerPhoneNumber)
  if (order.pickupTime) parts.push(`nhận ${new Date(order.pickupTime).toLocaleString('vi-VN')}`)
  return parts.join(' • ')
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [selectableTables, setSelectableTables] = useState<RestaurantTable[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasPreviousPage, setHasPreviousPage] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateOrderForm>(emptyForm)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [newItem, setNewItem] = useState<CreateOrderLine>({ menuItemId: '', quantity: 1, note: '' })

  async function loadOrders(targetPage = page) {
    setLoading(true); setError('')
    try {
      const data = await getOrders(keyword, tableFilter, statusFilter, targetPage, 10)
      setOrders(data.items ?? [])
      setPage(data.pageNumber || targetPage)
      setTotalPages(Math.max(data.totalPages || 1, 1))
      setTotalCount(data.totalCount || 0)
      setHasPreviousPage(Boolean(data.hasPreviousPage))
      setHasNextPage(Boolean(data.hasNextPage))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được danh sách đơn hàng.')
    } finally { setLoading(false) }
  }

  async function loadLookups(): Promise<RestaurantTable[]> {
    try {
      const [tableResult, selectableTableResult, menuResult] = await Promise.all([
        getTables('', '', '', 1, 100),
        getSelectableTables('Order'),
        getMenuItems('', '', true, true, 1, 100),
      ])
      setTables(tableResult.items ?? [])
      setSelectableTables(selectableTableResult)
      setMenuItems(menuResult.items ?? [])
      return selectableTableResult
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được dữ liệu bàn và thực đơn.')
      return []
    }
  }

  useEffect(() => { void Promise.all([loadOrders(1), loadLookups()]) }, [])

  async function refreshSelected(id: string) {
    const detail = await getOrder(id)
    setSelectedOrder(detail)
    setNoteDraft(detail.note ?? '')
  }

  async function openDetail(order: Order) {
    setError(''); setMessage(''); setSaving(true)
    try { await refreshSelected(order.id); setDetailOpen(true) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không tải được chi tiết đơn hàng.') }
    finally { setSaving(false) }
  }

  async function openCreate() {
    setError('')
    setMessage('')
    const options = await loadLookups()

    if (!options.length) {
      setError('Không có bàn phù hợp để tạo đơn hàng mới.')
      return
    }

    setCreateForm({
      ...emptyForm,
      restaurantTableId: options[0].id,
      items: emptyForm.items.map(item => ({ ...item })),
    })
    setCreateOpen(true)
  }

  function addCreateLine() {
    setCreateForm(form => ({ ...form, items: [...form.items, { menuItemId: '', quantity: 1, note: '' }] }))
  }

  function updateCreateLine(index: number, patch: Partial<CreateOrderLine>) {
    setCreateForm(form => ({ ...form, items: form.items.map((item, i) => i === index ? { ...item, ...patch } : item) }))
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault()
    if (!createForm.restaurantTableId || createForm.items.length === 0 || createForm.items.some(x => !x.menuItemId || x.quantity <= 0)) {
      setError('Đơn hàng phải có bàn và ít nhất một món hợp lệ.'); return
    }
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await createOrder(createForm)
      setMessage(result.message ?? 'Tạo đơn hàng thành công.')
      setCreateOpen(false); setCreateForm(emptyForm)
      await Promise.all([loadOrders(1), loadLookups()])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không tạo được đơn hàng.') }
    finally { setSaving(false) }
  }

  async function saveNote() {
    if (!selectedOrder) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await updateOrderNote(selectedOrder.id, noteDraft)
      setMessage(result.message ?? 'Cập nhật ghi chú thành công.')
      await Promise.all([refreshSelected(selectedOrder.id), loadOrders(page)])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không cập nhật được ghi chú.') }
    finally { setSaving(false) }
  }

  async function setStatus(order: Order, status: OrderStatus) {
    if (!await confirmAction(`Chuyển ${order.orderCode} sang trạng thái ${statuses.find(x => x.value === status)?.label}?`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await changeOrderStatus(order.id, status)
      setMessage(result.message ?? 'Cập nhật trạng thái thành công.')
      await loadOrders(page)
      if (selectedOrder?.id === order.id) await refreshSelected(order.id)
      await loadLookups()
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không cập nhật được trạng thái.') }
    finally { setSaving(false) }
  }

  async function addItem() {
    if (!selectedOrder || !newItem.menuItemId || newItem.quantity <= 0) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await addOrderItem(selectedOrder.id, newItem)
      setMessage(result.message ?? 'Đã thêm món vào đơn.')
      setNewItem({ menuItemId: '', quantity: 1, note: '' })
      await Promise.all([refreshSelected(selectedOrder.id), loadOrders(page)])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không thêm được món.') }
    finally { setSaving(false) }
  }

  async function changeQuantity(orderItemId: string, quantity: number) {
    if (!selectedOrder || quantity <= 0) return
    setSaving(true); setError('')
    try {
      await updateOrderItemQuantity(selectedOrder.id, orderItemId, quantity)
      await Promise.all([refreshSelected(selectedOrder.id), loadOrders(page)])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không cập nhật được số lượng.') }
    finally { setSaving(false) }
  }

  async function removeItem(orderItemId: string) {
    if (!selectedOrder || !await confirmAction('Hủy món này khỏi đơn?')) return
    setSaving(true); setError('')
    try {
      await cancelOrderItem(selectedOrder.id, orderItemId)
      await Promise.all([refreshSelected(selectedOrder.id), loadOrders(page)])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không hủy được món.') }
    finally { setSaving(false) }
  }

  async function removeOrder(order: Order) {
    if (!await confirmAction(`Xóa đơn ${order.orderCode}?`)) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = await deleteOrder(order.id)
      setMessage(result.message ?? 'Đã xóa đơn hàng.')
      const targetPage = orders.length === 1 && page > 1 ? page - 1 : page
      await Promise.all([loadOrders(targetPage), loadLookups()])
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không xóa được đơn hàng.') }
    finally { setSaving(false) }
  }

  const summary = useMemo(() => ({
    pending: orders.filter(x => x.status === 'Pending').length,
    cooking: orders.filter(x => x.status === 'Cooking').length,
    ready: orders.filter(x => x.status === 'Ready').length,
  }), [orders])

  return <section className="orders-page">
    <div className="page-toolbar"><div><h2>Quản lý đơn hàng</h2><p>Tạo đơn, theo dõi món tại bàn và đơn mang về.</p></div><button className="primary-button" onClick={() => void openCreate()}>+ Tạo đơn hàng</button></div>

    <div className="order-summary">
      <article><span>Tổng đơn phù hợp</span><strong>{totalCount}</strong></article>
      <article><span>Chờ xử lý trên trang</span><strong>{summary.pending}</strong></article>
      <article><span>Đang nấu trên trang</span><strong>{summary.cooking}</strong></article>
      <article><span>Sẵn sàng trên trang</span><strong>{summary.ready}</strong></article>
    </div>

    {message && <div className="inline-alert success">{message}</div>}
    {error && <div className="inline-alert error">{error}</div>}

    <form className="order-filters" onSubmit={event => { event.preventDefault(); void loadOrders(1) }}>
      <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm mã đơn, bàn, khách mang về hoặc ghi chú..." />
      <select value={tableFilter} onChange={event => setTableFilter(event.target.value)}><option value="">Tất cả bàn + mang về</option>{tables.map(table => <option key={table.id} value={table.id}>{table.name}</option>)}</select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Tất cả trạng thái</option>{statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
      <button type="submit">Lọc</button>
    </form>

    <div className="order-list">
      {loading ? <div className="empty-order-state">Đang tải đơn hàng...</div> : orders.length === 0 ? <div className="empty-order-state">Không có đơn hàng phù hợp.</div> : orders.map(order => <article className="order-card" key={order.id}>
        <div className="order-card-head"><div><strong>{order.orderCode}</strong><span>{orderContext(order)} • {new Date(order.createdAt).toLocaleString('vi-VN')}</span></div><span className={`order-status ${order.status.toLowerCase()}`}>{statuses.find(x => x.value === order.status)?.label ?? order.status}</span></div>
        <div className="order-card-body"><p>{order.note || 'Không có ghi chú.'}</p><div><span>{order.items?.filter(x => x.status !== 'Cancelled').length ?? 0} món</span><strong>{money(order.totalAmount)}</strong></div></div>
        <div className="order-card-actions"><button onClick={() => void openDetail(order)}>Chi tiết</button><select value={order.status} disabled={saving || order.status === 'Completed' || order.status === 'Cancelled'} onChange={event => void setStatus(order, event.target.value as OrderStatus)}>{statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}</select>{order.status !== 'Completed' && <button className="danger" onClick={() => void removeOrder(order)}>Xóa</button>}</div>
      </article>)}
    </div>

    <div className="pagination"><span>Trang {page}/{totalPages} • {totalCount} đơn</span><div><button disabled={!hasPreviousPage || loading} onClick={() => void loadOrders(page - 1)}>Trước</button><button disabled={!hasNextPage || loading} onClick={() => void loadOrders(page + 1)}>Sau</button></div></div>

    {createOpen && <div className="modal-backdrop" onMouseDown={() => !saving && setCreateOpen(false)}><div className="employee-modal order-modal" role="dialog" aria-modal="true" aria-labelledby="create-order-title" onMouseDown={event => event.stopPropagation()}><div className="modal-heading"><div><span className="modal-kicker">ĐƠN HÀNG MỚI</span><h2 id="create-order-title">Tạo đơn hàng</h2><p>Chọn bàn và thêm các món khách đã gọi.</p></div><button type="button" aria-label="Đóng" onClick={() => setCreateOpen(false)}>×</button></div><form id="create-order-form" className="order-form" onSubmit={submitCreate}>
      {error && <div className="modal-alert error" role="alert">{error}</div>}
      <label>Bàn<select required value={createForm.restaurantTableId} onChange={event => setCreateForm({...createForm, restaurantTableId:event.target.value})}><option value="">Chọn bàn</option>{selectableTables.map(table => <option key={table.id} value={table.id}>{table.name} • {table.areaName}</option>)}</select></label>
      <label>Ghi chú<textarea value={createForm.note} onChange={event => setCreateForm({...createForm, note:event.target.value})}/></label>
      <div className="order-lines"><div className="line-heading"><strong>Món trong đơn</strong><button type="button" onClick={addCreateLine}>+ Thêm món</button></div>{createForm.items.map((line, index) => <div className="order-line" key={index}><select required value={line.menuItemId} onChange={event => updateCreateLine(index,{menuItemId:event.target.value})}><option value="">Chọn món</option>{menuItems.map(item => <option key={item.id} value={item.id}>{item.name} • {money(item.price)}</option>)}</select><input type="number" min={1} value={line.quantity} onChange={event => updateCreateLine(index,{quantity:Number(event.target.value)})}/><input value={line.note} onChange={event => updateCreateLine(index,{note:event.target.value})} placeholder="Ghi chú món"/><button type="button" className="danger" onClick={() => setCreateForm({...createForm, items:createForm.items.filter((_, i) => i !== index)})}>×</button></div>)}</div>
    </form><div className="modal-actions modal-footer"><button type="button" onClick={() => setCreateOpen(false)}>Hủy</button><button type="submit" form="create-order-form" className="primary-button" disabled={saving}>{saving ? 'Đang tạo...' : 'Tạo đơn'}</button></div></div></div>}

    {detailOpen && selectedOrder && <div className="modal-backdrop" onMouseDown={() => !saving && setDetailOpen(false)}><div className="employee-modal order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title" onMouseDown={event => event.stopPropagation()}><div className="modal-heading"><div><span className="modal-kicker">CHI TIẾT ĐƠN HÀNG</span><h2 id="order-detail-title">{selectedOrder.orderCode}</h2><p>{orderContext(selectedOrder)} • Tổng tiền {money(selectedOrder.totalAmount)}</p></div><button type="button" aria-label="Đóng" onClick={() => setDetailOpen(false)}>×</button></div>
      <div className="order-detail-content">{error && <div className="modal-alert error" role="alert">{error}</div>}<section className="order-detail-section"><div className="order-detail-section-heading"><div><span>GHI CHÚ</span><h3>Ghi chú đơn hàng</h3></div><small>Lưu thông tin phục vụ hoặc yêu cầu của khách.</small></div><div className="detail-note"><textarea value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder="Nhập ghi chú đơn hàng"/><button type="button" onClick={() => void saveNote()} disabled={saving}>Lưu ghi chú</button></div></section>
      <section className="order-detail-section"><div className="order-detail-section-heading"><div><span>MÓN TRONG ĐƠN</span><h3>{selectedOrder.items.length} món đã thêm</h3></div><small>Có thể chỉnh số lượng với món chưa phục vụ.</small></div><div className="detail-items">{selectedOrder.items.map(item => <div className={`detail-item ${item.status.toLowerCase()}`} key={item.id}><div><strong>{item.menuItemName}</strong><span>{money(item.unitPrice)} • {item.note || 'Không ghi chú'}</span></div><div className="detail-item-actions"><span className={`order-item-status ${item.status.toLowerCase()}`}>{statuses.find(status => status.value === item.status)?.label ?? item.status}</span><label>Số lượng<input type="number" min={1} defaultValue={item.quantity} disabled={item.status === 'Cancelled' || item.status === 'Served'} onBlur={event => Number(event.target.value) !== item.quantity && void changeQuantity(item.id, Number(event.target.value))}/></label>{item.status !== 'Cancelled' && item.status !== 'Served' && <button type="button" className="danger" onClick={() => void removeItem(item.id)}>Hủy món</button>}</div></div>)}</div></section>
      <section className="order-detail-section add-item-section"><div className="order-detail-section-heading"><div><span>BỔ SUNG</span><h3>Thêm món vào đơn</h3></div></div><div className="add-order-item"><select aria-label="Chọn món thêm" value={newItem.menuItemId} onChange={event => setNewItem({...newItem,menuItemId:event.target.value})}><option value="">Chọn món thêm</option>{menuItems.map(item => <option key={item.id} value={item.id}>{item.name} • {money(item.price)}</option>)}</select><input aria-label="Số lượng" type="number" min={1} value={newItem.quantity} onChange={event => setNewItem({...newItem,quantity:Number(event.target.value)})}/><input aria-label="Ghi chú món" value={newItem.note} onChange={event => setNewItem({...newItem,note:event.target.value})} placeholder="Ghi chú món"/><button type="button" onClick={() => void addItem()} disabled={saving}>Thêm món</button></div></section></div>
      <div className="modal-actions modal-footer"><button type="button" onClick={() => setDetailOpen(false)}>Đóng</button></div>
    </div></div>}
  </section>
}
