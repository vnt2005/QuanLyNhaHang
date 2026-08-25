import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { getSelectableTables, type RestaurantTable } from '../api/areasTables'
import {
  cancelReservation,
  createReservation,
  getReservation,
  getReservations,
  updateReservation,
  updateReservationStatus,
  type Reservation,
  type ReservationInput,
  type ReservationStatus,
} from '../api/reservations'

const PAGE_SIZE = 12

const labels: Record<ReservationStatus, string> = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  CheckedIn: 'Đã nhận bàn',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
  NoShow: 'Vắng mặt',
}

const nextActions: Partial<Record<ReservationStatus, Array<{ status: ReservationStatus; label: string }>>> = {
  Pending: [
    { status: 'Confirmed', label: 'Xác nhận' },
    { status: 'NoShow', label: 'Vắng mặt' },
  ],
  Confirmed: [
    { status: 'CheckedIn', label: 'Nhận bàn' },
    { status: 'NoShow', label: 'Vắng mặt' },
  ],
  CheckedIn: [{ status: 'Completed', label: 'Hoàn tất' }],
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function toLocalInput(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function emptyForm(tableId = ''): ReservationInput {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000)
  nextHour.setMinutes(0, 0, 0)
  return {
    restaurantTableId: tableId,
    customerName: '',
    phoneNumber: '',
    email: '',
    numberOfGuests: 1,
    reservationTime: toLocalInput(nextHour.toISOString()),
    depositAmount: 0,
    note: '',
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
}

export default function ReservationsPage() {
  const [items, setItems] = useState<Reservation[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Reservation | null>(null)
  const [form, setForm] = useState<ReservationInput>(() => emptyForm())
  const [formError, setFormError] = useState('')
  const [detail, setDetail] = useState<Reservation | null>(null)

  const summary = useMemo(() => ({
    pending: items.filter(item => item.status === 'Pending').length,
    confirmed: items.filter(item => item.status === 'Confirmed').length,
    checkedIn: items.filter(item => item.status === 'CheckedIn').length,
    deposits: items.reduce((sum, item) => sum + item.depositAmount, 0),
  }), [items])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getReservations(keyword, status, fromDate, toDate, page, PAGE_SIZE)
      setItems(result.items)
      setTotalPages(Math.max(result.totalPages, 1))
      setTotalCount(result.totalCount)
      if (page > Math.max(result.totalPages, 1)) setPage(Math.max(result.totalPages, 1))
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }, [fromDate, keyword, page, status, toDate])

  const loadTableOptions = useCallback(async () => {
    const result = await getSelectableTables('Reservation')
    setTables(result)
    return result
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    let ignore = false

    void getSelectableTables('Reservation')
      .then(result => {
        if (!ignore) setTables(result)
      })
      .catch(exception => {
        if (!ignore) setError(getErrorMessage(exception))
      })

    return () => {
      ignore = true
    }
  }, [])

  async function openCreate() {
    setError('')
    try {
      const options = await loadTableOptions()
      if (!options.length) {
        setError('Không có bàn đang hoạt động để tạo đặt bàn.')
        return
      }

      setEditing(null)
      setForm(emptyForm(options[0].id))
      setFormError('')
      setFormOpen(true)
    } catch (exception) {
      setError(getErrorMessage(exception))
    }
  }

  async function openEdit(item: Reservation) {
    setError('')
    try {
      const options = await loadTableOptions()
      if (!options.some(table => table.id === item.restaurantTableId)) {
        setError('Bàn của lịch đặt này đã ngừng hoạt động nên không thể tiếp tục chỉnh sửa.')
        return
      }

      setEditing(item)
      setForm({
        restaurantTableId: item.restaurantTableId,
        customerName: item.customerName,
        phoneNumber: item.phoneNumber,
        email: item.email ?? '',
        numberOfGuests: item.numberOfGuests,
        reservationTime: toLocalInput(item.reservationTime),
        depositAmount: item.depositAmount,
        note: item.note ?? '',
      })
      setFormError('')
      setFormOpen(true)
      setDetail(null)
    } catch (exception) {
      setError(getErrorMessage(exception))
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    const table = tables.find(item => item.id === form.restaurantTableId)
    if (!table || !form.customerName.trim() || !form.phoneNumber.trim() || !form.reservationTime) {
      setFormError('Vui lòng nhập đầy đủ bàn, khách hàng, số điện thoại và thời gian.')
      return
    }
    if (form.numberOfGuests <= 0 || form.numberOfGuests > table.capacity) {
      setFormError(`Số khách phải từ 1 đến ${table.capacity} người theo sức chứa của bàn.`)
      return
    }
    if (new Date(form.reservationTime).getTime() <= Date.now()) {
      setFormError('Thời gian đặt bàn phải lớn hơn thời gian hiện tại.')
      return
    }
    if (form.depositAmount < 0) {
      setFormError('Tiền cọc không được âm.')
      return
    }

    setSaving(true)
    try {
      const result = editing
        ? await updateReservation(editing.id, form)
        : await createReservation(form)
      setMessage(result.message ?? (editing ? 'Đã cập nhật đặt bàn.' : 'Đã tạo đặt bàn.'))
      setFormOpen(false)
      await Promise.all([load(), loadTableOptions()])
    } catch (exception) {
      setFormError(getErrorMessage(exception))
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(item: Reservation, nextStatus: ReservationStatus) {
    if (!await confirmAction(`Chuyển ${item.reservationCode} sang “${labels[nextStatus]}”?`)) return
    setActionId(item.id)
    setError('')
    try {
      const result = await updateReservationStatus(item.id, nextStatus)
      setMessage(result.message ?? 'Đã cập nhật trạng thái đặt bàn.')
      setDetail(null)
      await load()
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  async function cancel(item: Reservation) {
    if (!await confirmAction(`Hủy đặt bàn ${item.reservationCode}?`)) return
    setActionId(item.id)
    setError('')
    try {
      const result = await cancelReservation(item.id)
      setMessage(result.message ?? 'Đã hủy đặt bàn.')
      setDetail(null)
      await load()
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  async function openDetail(item: Reservation) {
    setActionId(item.id)
    try {
      setDetail(await getReservation(item.id))
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  return (
    <section className="reservations-page">
      <header className="reservations-toolbar">
        <div><span>ĐẶT BÀN</span><h2>Lịch đặt &amp; tiếp nhận khách</h2><p>Quản lý lịch, tiền cọc và tiến trình nhận bàn theo đúng trạng thái vận hành.</p></div>
        <button type="button" onClick={() => void openCreate()} disabled={loading}>+ Tạo đặt bàn</button>
      </header>

      {error && <div className="reservations-alert error"><span>!</span><p>{error}</p><button type="button" aria-label="Đóng thông báo lỗi" onClick={() => setError('')}>×</button></div>}
      {message && <div className="reservations-alert success"><span>✓</span><p>{message}</p><button type="button" aria-label="Đóng thông báo thành công" onClick={() => setMessage('')}>×</button></div>}

      <section className="reservations-summary">
        <article><small>Tổng kết quả</small><strong>{totalCount}</strong><span>lịch đặt phù hợp</span></article>
        <article><small>Chờ xác nhận</small><strong>{summary.pending}</strong><span>trên trang hiện tại</span></article>
        <article><small>Sắp nhận bàn</small><strong>{summary.confirmed}</strong><span>đã xác nhận</span></article>
        <article><small>Đang dùng bàn</small><strong>{summary.checkedIn}</strong><span>đã check-in</span></article>
        <article><small>Tiền cọc</small><strong>{formatMoney(summary.deposits)}</strong><span>trên trang hiện tại</span></article>
      </section>

      <section className="reservations-panel">
        <div className="reservations-filters">
          <input aria-label="Tìm lịch đặt bàn" value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1) }} placeholder="Mã đặt bàn, khách, SĐT hoặc bàn…" />
          <select aria-label="Lọc lịch đặt theo trạng thái" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label>Từ ngày<input type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); setPage(1) }} /></label>
          <label>Đến ngày<input type="date" value={toDate} onChange={event => { setToDate(event.target.value); setPage(1) }} /></label>
        </div>

        <div className="reservations-table-wrap">
          <table className="reservations-table">
            <thead><tr><th>Khách hàng</th><th>Bàn</th><th>Thời gian</th><th>Số khách</th><th>Tiền cọc</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="reservations-empty">Đang tải lịch đặt…</td></tr>
                : items.length === 0 ? <tr><td colSpan={7} className="reservations-empty"><strong>Chưa có lịch đặt phù hợp</strong><span>Thử thay đổi bộ lọc hoặc tạo lịch mới.</span></td></tr>
                : items.map(item => (
                  <tr key={item.id}>
                    <td><button type="button" className="reservation-name" onClick={() => void openDetail(item)} disabled={actionId === item.id}><span>{item.reservationCode}</span><strong>{item.customerName}</strong><small>{item.phoneNumber}</small></button></td>
                    <td><strong>{item.restaurantTableName}</strong></td>
                    <td>{formatDateTime(item.reservationTime)}</td>
                    <td>{item.numberOfGuests} người</td>
                    <td>{formatMoney(item.depositAmount)}</td>
                    <td><span className={`reservation-status ${item.status.toLowerCase()}`}>{labels[item.status]}</span></td>
                    <td><div className="reservation-actions">
                      {(item.status === 'Pending' || item.status === 'Confirmed') && <button onClick={() => void openEdit(item)}>Sửa</button>}
                      {(nextActions[item.status] ?? []).map(action => <button key={action.status} onClick={() => void changeStatus(item, action.status)} disabled={actionId === item.id}>{action.label}</button>)}
                      {(item.status === 'Pending' || item.status === 'Confirmed') && <button className="danger" onClick={() => void cancel(item)} disabled={actionId === item.id}>Hủy</button>}
                    </div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <footer className="reservations-pagination"><span>Trang {page}/{totalPages} • {totalCount} kết quả</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau →</button></div></footer>
      </section>

      {formOpen && <div className="reservations-modal-backdrop" onMouseDown={() => !saving && setFormOpen(false)}><form className="reservations-modal" role="dialog" aria-modal="true" aria-labelledby="reservation-form-title" onSubmit={submit} onMouseDown={event => event.stopPropagation()}>
        <header><div><span>{editing ? 'CẬP NHẬT' : 'TẠO MỚI'}</span><h3 id="reservation-form-title">{editing ? editing.reservationCode : 'Đặt bàn mới'}</h3></div><button type="button" aria-label="Đóng biểu mẫu đặt bàn" onClick={() => setFormOpen(false)}>×</button></header>
        <div className="reservation-form-grid">
          <label>Bàn<select value={form.restaurantTableId} onChange={event => setForm(current => ({ ...current, restaurantTableId: event.target.value }))} required><option value="">Chọn bàn</option>{tables.map(table => <option key={table.id} value={table.id}>{table.name} • {table.areaName} • {table.capacity} chỗ</option>)}</select></label>
          <label>Thời gian<input type="datetime-local" value={form.reservationTime} onChange={event => setForm(current => ({ ...current, reservationTime: event.target.value }))} required /></label>
          <label>Tên khách<input value={form.customerName} onChange={event => setForm(current => ({ ...current, customerName: event.target.value }))} required /></label>
          <label>Số điện thoại<input value={form.phoneNumber} onChange={event => setForm(current => ({ ...current, phoneNumber: event.target.value }))} required /></label>
          <label>Email<input type="email" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></label>
          <label>Số khách<input type="number" min="1" value={form.numberOfGuests} onChange={event => setForm(current => ({ ...current, numberOfGuests: Number(event.target.value) }))} required /></label>
          <label>Tiền cọc<input type="number" min="0" step="1000" value={form.depositAmount} onChange={event => setForm(current => ({ ...current, depositAmount: Number(event.target.value) }))} /></label>
          <label className="wide">Ghi chú<textarea value={form.note} onChange={event => setForm(current => ({ ...current, note: event.target.value }))} rows={3} /></label>
        </div>
        {formError && <div className="reservation-form-error">{formError}</div>}
        <footer><button type="button" className="secondary" onClick={() => setFormOpen(false)}>Đóng</button><button disabled={saving}>{saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo đặt bàn'}</button></footer>
      </form></div>}

      {detail && <div className="reservations-modal-backdrop" onMouseDown={() => setDetail(null)}><section className="reservations-modal detail" role="dialog" aria-modal="true" aria-labelledby="reservation-detail-title" onMouseDown={event => event.stopPropagation()}>
        <header><div><span>CHI TIẾT ĐẶT BÀN</span><h3 id="reservation-detail-title">{detail.reservationCode}</h3></div><button type="button" aria-label="Đóng chi tiết đặt bàn" onClick={() => setDetail(null)}>×</button></header>
        <div className="reservation-detail-grid">
          <article><small>Khách hàng</small><strong>{detail.customerName}</strong><span>{detail.phoneNumber}</span><span>{detail.email ?? 'Không có email'}</span></article>
          <article><small>Bàn & thời gian</small><strong>{detail.restaurantTableName}</strong><span>{formatDateTime(detail.reservationTime)}</span><span>{detail.numberOfGuests} người</span></article>
          <article><small>Thanh toán</small><strong>{formatMoney(detail.depositAmount)}</strong><span>Tiền cọc đã ghi nhận</span></article>
          <article><small>Trạng thái</small><strong>{labels[detail.status]}</strong><span>Tạo lúc {formatDateTime(detail.createdAt)}</span></article>
        </div>
        <div className="reservation-timeline">
          <span><strong>Tạo</strong>{formatDateTime(detail.createdAt)}</span>
          <span><strong>Xác nhận</strong>{formatDateTime(detail.confirmedAt)}</span>
          <span><strong>Nhận bàn</strong>{formatDateTime(detail.checkedInAt)}</span>
          <span><strong>Hoàn tất</strong>{formatDateTime(detail.completedAt)}</span>
          <span><strong>Hủy</strong>{formatDateTime(detail.cancelledAt)}</span>
        </div>
        {detail.note && <div className="reservation-note"><strong>Ghi chú</strong><p>{detail.note}</p></div>}
        <footer><button type="button" onClick={() => setDetail(null)}>Đóng</button>{(detail.status === 'Pending' || detail.status === 'Confirmed') && <button type="button" onClick={() => openEdit(detail)}>Chỉnh sửa</button>}</footer>
      </section></div>}
    </section>
  )
}
