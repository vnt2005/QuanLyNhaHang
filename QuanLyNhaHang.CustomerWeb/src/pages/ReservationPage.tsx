import { CheckCircle2, Clock3, Phone } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CustomerSession } from '../api/customerAuth'
import {
  createCustomerReservation,
  type CustomerReservationResult,
  type CustomerSiteBootstrap,
} from '../api/customerSite'
import reservationImage from '../assets/reservation-dining-room.webp'

function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function reservationPrefill() {
  const params = new URLSearchParams(window.location.search)
  const minimumDate = tomorrow()
  const requestedDate = params.get('date') || ''
  const requestedTime = params.get('time') || ''
  const requestedGuests = Number.parseInt(params.get('guests') || '', 10)

  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && requestedDate >= minimumDate ? requestedDate : minimumDate,
    time: /^\d{2}:\d{2}$/.test(requestedTime) ? requestedTime : '19:00',
    guests: Number.isFinite(requestedGuests) && requestedGuests >= 1 && requestedGuests <= 20 ? requestedGuests : 2,
    area: params.get('area') || '',
  }
}

export default function ReservationPage({
  data,
  session,
}: {
  data: CustomerSiteBootstrap
  session: CustomerSession | null
}) {
  const [prefill] = useState(reservationPrefill)
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [numberOfGuests, setNumberOfGuests] = useState(prefill.guests)
  const [date, setDate] = useState(prefill.date)
  const [time, setTime] = useState(prefill.time)
  const [tableId, setTableId] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CustomerReservationResult | null>(null)

  const eligibleTables = useMemo(
    () => data.reservationTables.filter(table => table.capacity >= numberOfGuests),
    [data.reservationTables, numberOfGuests],
  )

  useEffect(() => {
    if (!eligibleTables.some(table => table.id === tableId)) {
      const preferredTable = prefill.area
        ? eligibleTables.find(table => table.areaName === prefill.area)
        : undefined
      setTableId(preferredTable?.id ?? eligibleTables[0]?.id ?? '')
    }
  }, [eligibleTables, prefill.area, tableId])

  useEffect(() => {
    if (!session) return
    setCustomerName(current => current || [session.ho, session.ten].filter(Boolean).join(' '))
    setPhoneNumber(current => current || session.phoneNumber || '')
    setEmail(current => current || session.email)
  }, [session])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || !tableId) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const reservationTime = new Date(`${date}T${time}:00`).toISOString()
      const response = await createCustomerReservation({
        restaurantTableId: tableId,
        customerName,
        phoneNumber,
        email: email.trim() || null,
        numberOfGuests,
        reservationTime,
        note: note.trim() || null,
      }, session?.token)
      setResult(response.data)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không gửi được yêu cầu đặt bàn.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="reservation-page page-section">
      <div className="reservation-layout">
        <div className="reservation-photo"><img src={reservationImage} alt="Không gian bàn ăn tại nhà hàng" /></div>
        <section className="reservation-content">
          <h1>Đặt bàn cho dịp của bạn</h1>
          <p className="page-lead">Chọn thời gian và không gian phù hợp. Nhà hàng sẽ tiếp nhận và xác nhận yêu cầu của bạn.</p>
          {error ? <div className="form-notice error" role="alert">{error}</div> : null}
          <form className="reservation-form" onSubmit={submit}>
            <div className="form-row">
              <label>Họ và tên *<input value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} autoComplete="name" /></label>
              <label>Số điện thoại *<input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required pattern={'[0-9 +\\(\\)\\-]{9,15}'} autoComplete="tel" /></label>
            </div>
            <div className="form-row">
              <label>Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
              <label>Số khách *<select value={numberOfGuests} onChange={event => setNumberOfGuests(Number(event.target.value))}>{Array.from({ length: 20 }, (_, index) => index + 1).map(value => <option value={value} key={value}>{value} khách</option>)}</select></label>
            </div>
            <div className="form-row">
              <label>Ngày *<input type="date" min={tomorrow()} value={date} onChange={event => setDate(event.target.value)} required /></label>
              <label>Giờ *<input type="time" value={time} onChange={event => setTime(event.target.value)} required /></label>
            </div>
            <label>Khu vực / bàn *
              <select value={tableId} onChange={event => setTableId(event.target.value)} required disabled={!eligibleTables.length}>
                {eligibleTables.length ? eligibleTables.map(table => <option key={table.id} value={table.id}>{table.areaName} – {table.name} (tối đa {table.capacity} khách)</option>) : <option value="">Không có bàn phù hợp</option>}
              </select>
            </label>
            <label>Ghi chú<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={300} placeholder="Ví dụ: ưu tiên bàn gần cửa sổ, có trẻ nhỏ…" /><small className="character-count">{note.length}/300</small></label>
            <button className="primary-button full" disabled={busy || !eligibleTables.length}>{busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt bàn'}</button>
          </form>

          {result ? (
            <div className="reservation-success" role="status">
              <CheckCircle2 />
              <div><strong>Yêu cầu đặt bàn đã được gửi thành công!</strong><p>Nhà hàng sẽ liên hệ xác nhận với bạn trong thời gian sớm nhất.</p><small>Mã yêu cầu: #{result.reservationCode}</small></div>
            </div>
          ) : null}
        </section>
        <aside className="reservation-help">
          <section><Clock3 /><div><h2>Giờ mở cửa</h2><p>{data.restaurant ? `${data.restaurant.openingTime} – ${data.restaurant.closingTime}` : 'Đang cập nhật'}</p><small>Vui lòng chọn giờ phù hợp với thời gian phục vụ.</small></div></section>
          <section><Phone /><div><h2>Hỗ trợ đặt bàn</h2><strong>{data.restaurant?.phoneNumber || 'Đang cập nhật'}</strong><small>Gọi cho chúng tôi nếu bạn cần hỗ trợ nhóm đông người hoặc dịp đặc biệt.</small></div></section>
        </aside>
      </div>
    </main>
  )
}
