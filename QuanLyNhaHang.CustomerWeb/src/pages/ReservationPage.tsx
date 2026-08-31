import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CustomerSession } from '../services/customerAuth'
import {
  createCustomerReservation,
  type CustomerReservationResult,
  type CustomerSiteBootstrap,
} from '../services/customerSite'
import reservationImage from '../assets/reservation-dining-room.webp'

const quickGuestCounts = [1, 2, 3, 4, 5, 6, 8, 10]
const quickGuestCountSet = new Set(quickGuestCounts)
const otherGuestCounts = Array.from({ length: 20 }, (_, index) => index + 1).filter(value => !quickGuestCountSet.has(value))
const preferredReservationTimes = [
  '11:00', '11:30', '12:00', '12:30', '13:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
]

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

function clockMinutes(value?: string | null) {
  const match = value?.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function clockValue(value?: string | null) {
  const minutes = clockMinutes(value)
  if (minutes == null) return null
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function suggestedTimes(openingTime?: string | null, closingTime?: string | null) {
  const opening = clockMinutes(openingTime)
  const closing = clockMinutes(closingTime)
  if (opening == null || closing == null || opening >= closing) return preferredReservationTimes
  const preferred = preferredReservationTimes.filter(value => {
    const minutes = clockMinutes(value)
    return minutes != null && minutes >= opening && minutes <= closing
  })
  if (preferred.length >= 4) return preferred
  const fallback: string[] = []
  for (let minutes = Math.ceil(opening / 30) * 30; minutes <= closing && fallback.length < 12; minutes += 60) {
    fallback.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
  }
  return Array.from(new Set([...preferred, ...fallback]))
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

export default function ReservationPage({ data, session }: { data: CustomerSiteBootstrap; session: CustomerSession | null }) {
  const [prefill] = useState(reservationPrefill)
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [numberOfGuests, setNumberOfGuests] = useState(prefill.guests)
  const [date, setDate] = useState(prefill.date)
  const [time, setTime] = useState(prefill.time)
  const [tableId, setTableId] = useState(() => {
    const availableTables = data.reservationTables.filter(table => table.capacity >= prefill.guests)
    const preferredTable = prefill.area ? availableTables.find(table => table.areaName === prefill.area) : undefined
    return preferredTable?.id ?? availableTables[0]?.id ?? ''
  })
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CustomerReservationResult | null>(null)

  const eligibleTables = useMemo(() => data.reservationTables.filter(table => table.capacity >= numberOfGuests), [data.reservationTables, numberOfGuests])
  const selectedTable = useMemo(() => eligibleTables.find(table => table.id === tableId) ?? null, [eligibleTables, tableId])
  const timeOptions = useMemo(() => suggestedTimes(data.restaurant?.openingTime, data.restaurant?.closingTime), [data.restaurant?.closingTime, data.restaurant?.openingTime])
  const openingTime = clockValue(data.restaurant?.openingTime)
  const closingTime = clockValue(data.restaurant?.closingTime)
  const openingHours = openingTime && closingTime ? `${openingTime} – ${closingTime}` : 'Đang cập nhật'

  useEffect(() => {
    if (!eligibleTables.some(table => table.id === tableId)) {
      const preferredTable = prefill.area ? eligibleTables.find(table => table.areaName === prefill.area) : undefined
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
    <main className="bistro-reservation-page">
      <section className="bistro-reservation-scene">
        <img src={reservationImage} alt="Không gian nhà hàng" />
        <div className="reservation-scene-overlay" />
        <div className="reservation-scene-copy">
          <span>ĐẶT BÀN TRỰC TUYẾN</span>
          <h1>Giữ một chỗ<br />cho bữa ăn sắp tới.</h1>
          <p>Chọn lịch, số khách và bàn phù hợp. Nhà hàng sẽ xác nhận lại trước giờ dùng bữa.</p>
          <div className="reservation-scene-facts">
            <span><Clock3 /><small>Mở cửa</small><strong>{openingHours}</strong></span>
            <span><Phone /><small>Hotline</small><strong>{data.restaurant?.phoneNumber || 'Đang cập nhật'}</strong></span>
          </div>
        </div>
      </section>

      <section className="bistro-reservation-booking">
        <header>
          <div><span>Đặt bàn</span><h2>Chọn lịch dùng bữa</h2></div>
          <div className="reservation-live-summary"><CalendarDays /><span><small>{displayDate(date)}</small><strong>{time} · {numberOfGuests} khách</strong></span></div>
        </header>

        {error ? <Alert variant="destructive"><AlertTitle>Không thể gửi yêu cầu</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <form onSubmit={submit}>
          <section className="reservation-booking-block">
            <div className="block-title"><b>01</b><div><h3>Thời gian & số khách</h3><p>Chọn thời điểm bạn muốn đến nhà hàng.</p></div></div>
            <div className="reservation-booking-grid">
              <div className="reservation-guest-control">
                <label>Số khách</label>
                <div>{quickGuestCounts.map(value => <Button key={value} type="button" size="sm" variant={numberOfGuests === value ? 'default' : 'outline'} onClick={() => setNumberOfGuests(value)}>{value}</Button>)}</div>
                <select value={quickGuestCountSet.has(numberOfGuests) ? '' : numberOfGuests} onChange={event => { if (event.target.value) setNumberOfGuests(Number(event.target.value)) }}>
                  <option value="">Số khách khác</option>
                  {otherGuestCounts.map(value => <option value={value} key={value}>{value} khách</option>)}
                </select>
              </div>
              <label className="reservation-date-control">Ngày đến<Input type="date" min={tomorrow()} value={date} onChange={event => setDate(event.target.value)} required /></label>
            </div>
            <div className="reservation-time-control">
              <div><label>Khung giờ</label><small>Đang chọn <strong>{time}</strong></small></div>
              <div className="time-pills">{timeOptions.map(value => <Button key={value} type="button" size="sm" variant={time === value ? 'default' : 'outline'} onClick={() => setTime(value)}>{value}</Button>)}</div>
              <label className="custom-time">Giờ khác<Input type="time" value={time} onChange={event => setTime(event.target.value)} required /></label>
            </div>
          </section>

          <section className="reservation-booking-block">
            <div className="block-title"><b>02</b><div><h3>Chọn bàn</h3><p>{eligibleTables.length} bàn phù hợp với nhóm {numberOfGuests} khách.</p></div></div>
            {eligibleTables.length ? (
              <div className="reservation-table-chips">
                {eligibleTables.map(table => {
                  const selected = table.id === tableId
                  return (
                    <button key={table.id} type="button" className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => setTableId(table.id)}>
                      <span><MapPin /><small>{table.areaName}</small></span>
                      <strong>{table.name}</strong>
                      <em>Tối đa {table.capacity} khách</em>
                      {selected ? <CheckCircle2 /> : null}
                    </button>
                  )
                })}
              </div>
            ) : (
              <Alert><UsersRound /><AlertTitle>Chưa có bàn phù hợp</AlertTitle><AlertDescription>Giảm số khách hoặc liên hệ nhà hàng để được hỗ trợ.</AlertDescription></Alert>
            )}
          </section>

          <section className="reservation-booking-block">
            <div className="block-title"><b>03</b><div><h3>Thông tin liên hệ</h3><p>Dùng để nhà hàng xác nhận yêu cầu của bạn.</p></div></div>
            <div className="reservation-contact-grid">
              <label>Họ và tên<Input value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} autoComplete="name" /></label>
              <label>Số điện thoại<Input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required pattern={'[0-9 +\\(\\)\\-]{9,15}'} autoComplete="tel" /></label>
              <label className="wide">Email<Input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
              <label className="wide">Ghi chú<Textarea value={note} onChange={event => setNote(event.target.value)} maxLength={300} placeholder="Ví dụ: ưu tiên gần cửa sổ, có trẻ nhỏ, sinh nhật…" /><small>{note.length}/300</small></label>
            </div>
          </section>

          <section className="reservation-confirm-strip">
            <div>
              <span><CalendarDays /><small>Ngày</small><strong>{displayDate(date)}</strong></span>
              <span><Clock3 /><small>Giờ</small><strong>{time}</strong></span>
              <span><UsersRound /><small>Khách</small><strong>{numberOfGuests}</strong></span>
              <span><MapPin /><small>Bàn</small><strong>{selectedTable ? `${selectedTable.areaName} · ${selectedTable.name}` : 'Chưa chọn'}</strong></span>
            </div>
            <Button size="lg" disabled={busy || !eligibleTables.length}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt bàn'}</Button>
          </section>

          {result ? (
            <Alert className="reservation-success-alert"><CheckCircle2 /><AlertTitle>Yêu cầu đã được gửi</AlertTitle><AlertDescription>Nhà hàng sẽ liên hệ xác nhận. Mã yêu cầu: #{result.reservationCode}</AlertDescription></Alert>
          ) : null}
        </form>

        <div className="reservation-confirm-note"><ShieldCheck /><span><strong>Nhà hàng sẽ xác nhận trước.</strong><small>Yêu cầu chỉ hoàn tất sau khi nhà hàng phản hồi.</small></span></div>
      </section>
    </main>
  )
}
