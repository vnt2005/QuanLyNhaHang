import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CustomerSession } from '../services/customerAuth'
import {
  createCustomerReservation,
  type CustomerReservationResult,
  type CustomerSiteBootstrap,
} from '../services/customerSite'
import reservationImage from '../assets/reservation-dining-room.webp'

const quickGuestCounts = [1, 2, 3, 4, 5, 6, 8, 10]
const quickGuestCountSet = new Set(quickGuestCounts)
const otherGuestCounts = Array.from({ length: 20 }, (_, index) => index + 1)
  .filter(value => !quickGuestCountSet.has(value))
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
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function SectionHeading({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="reservation-section-heading">
      <span className="reservation-step-number" aria-hidden="true">{step}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  )
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
  const [tableId, setTableId] = useState(() => {
    const availableTables = data.reservationTables.filter(table => table.capacity >= prefill.guests)
    const preferredTable = prefill.area
      ? availableTables.find(table => table.areaName === prefill.area)
      : undefined
    return preferredTable?.id ?? availableTables[0]?.id ?? ''
  })
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CustomerReservationResult | null>(null)

  const eligibleTables = useMemo(
    () => data.reservationTables.filter(table => table.capacity >= numberOfGuests),
    [data.reservationTables, numberOfGuests],
  )
  const selectedTable = useMemo(
    () => eligibleTables.find(table => table.id === tableId) ?? null,
    [eligibleTables, tableId],
  )
  const timeOptions = useMemo(
    () => suggestedTimes(data.restaurant?.openingTime, data.restaurant?.closingTime),
    [data.restaurant?.closingTime, data.restaurant?.openingTime],
  )
  const openingTime = clockValue(data.restaurant?.openingTime)
  const closingTime = clockValue(data.restaurant?.closingTime)
  const openingHours = openingTime && closingTime
    ? `${openingTime} – ${closingTime}`
    : 'Đang cập nhật'

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
      <div className="reservation-shell">
        <header className="reservation-page-heading">
          <div>
            <h1>Đặt bàn</h1>
            <p>Chọn thời gian, bàn phù hợp và gửi yêu cầu. Nhà hàng sẽ xác nhận lại với bạn trước giờ dùng bữa.</p>
          </div>
          <div className="reservation-heading-info" aria-label="Thông tin nhà hàng">
            <span><Clock3 aria-hidden="true" /><small>Giờ mở cửa</small><strong>{openingHours}</strong></span>
            <span><Phone aria-hidden="true" /><small>Hỗ trợ</small><strong>{data.restaurant?.phoneNumber || 'Đang cập nhật'}</strong></span>
          </div>
        </header>

        <div className="reservation-layout">
          <section className="reservation-content">
            {error ? <div className="form-notice error reservation-form-notice" role="alert">{error}</div> : null}

            <form id="reservation-booking-form" className="reservation-form" onSubmit={submit}>
              <section className="reservation-form-section" aria-labelledby="reservation-time-heading">
                <div id="reservation-time-heading">
                  <SectionHeading
                    step={1}
                    title="Chọn lịch dùng bữa"
                    description="Chọn số khách, ngày và khung giờ bạn muốn đến nhà hàng."
                  />
                </div>

                <div className="reservation-schedule-grid">
                  <div className="reservation-guest-picker">
                    <span className="reservation-field-title"><UsersRound aria-hidden="true" /> Số khách</span>
                    <div className="reservation-guest-options" role="group" aria-label="Chọn nhanh số lượng khách">
                      {quickGuestCounts.map(value => (
                        <button
                          className={numberOfGuests === value ? 'selected' : ''}
                          type="button"
                          aria-pressed={numberOfGuests === value}
                          onClick={() => setNumberOfGuests(value)}
                          key={value}
                        >
                          {value}
                        </button>
                      ))}
                      <select
                        className={quickGuestCountSet.has(numberOfGuests) ? '' : 'selected'}
                        aria-label="Chọn số lượng khách khác"
                        value={quickGuestCountSet.has(numberOfGuests) ? '' : numberOfGuests}
                        onChange={event => {
                          if (event.target.value) setNumberOfGuests(Number(event.target.value))
                        }}
                      >
                        <option value="">Khác</option>
                        {otherGuestCounts.map(value => <option value={value} key={value}>{value} khách</option>)}
                      </select>
                    </div>
                  </div>

                  <label className="reservation-date-field">
                    <span className="reservation-field-title"><CalendarDays aria-hidden="true" /> Ngày đặt bàn</span>
                    <input type="date" min={tomorrow()} value={date} onChange={event => setDate(event.target.value)} required />
                  </label>
                </div>

                <div className="reservation-time-picker">
                  <div className="reservation-time-picker-heading">
                    <span className="reservation-field-title"><Clock3 aria-hidden="true" /> Giờ dùng bữa</span>
                    <small>Đang chọn <strong>{time}</strong></small>
                  </div>
                  <div role="group" aria-label="Chọn nhanh giờ dùng bữa">
                    {timeOptions.map(value => (
                      <button
                        className={time === value ? 'selected' : ''}
                        type="button"
                        aria-pressed={time === value}
                        onClick={() => setTime(value)}
                        key={value}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <label className="reservation-custom-time">
                    <span>Giờ khác</span>
                    <input type="time" value={time} onChange={event => setTime(event.target.value)} required />
                  </label>
                </div>
              </section>

              <section className="reservation-form-section" aria-labelledby="reservation-table-heading">
                <div id="reservation-table-heading">
                  <SectionHeading
                    step={2}
                    title="Chọn bàn phù hợp"
                    description={`${eligibleTables.length} bàn đang phù hợp với nhóm ${numberOfGuests} khách.`}
                  />
                </div>

                {eligibleTables.length ? (
                  <div className="reservation-table-options" role="group" aria-label="Chọn bàn đặt trước">
                    {eligibleTables.map(table => {
                      const selected = table.id === tableId
                      return (
                        <button
                          className={selected ? 'reservation-table-option selected' : 'reservation-table-option'}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setTableId(table.id)}
                          key={table.id}
                        >
                          <span className="reservation-table-option-icon"><MapPin aria-hidden="true" /></span>
                          <span className="reservation-table-option-copy">
                            <small>{table.areaName}</small>
                            <strong>{table.name}</strong>
                            <span>Tối đa {table.capacity} khách</span>
                          </span>
                          <span className="reservation-table-check" aria-hidden="true"><CheckCircle2 /></span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="reservation-no-table">
                    <UsersRound aria-hidden="true" />
                    <div><strong>Chưa có bàn phù hợp</strong><p>Hãy giảm số lượng khách hoặc liên hệ nhà hàng để được hỗ trợ.</p></div>
                  </div>
                )}
              </section>

              <section className="reservation-form-section reservation-final-section" aria-labelledby="reservation-customer-heading">
                <div id="reservation-customer-heading">
                  <SectionHeading
                    step={3}
                    title="Thông tin liên hệ"
                    description="Thông tin này được dùng để nhà hàng xác nhận yêu cầu đặt bàn."
                  />
                </div>

                <div className="form-row">
                  <label>Họ và tên *<input value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} autoComplete="name" /></label>
                  <label>Số điện thoại *<input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required pattern={'[0-9 +\\(\\)\\-]{9,15}'} autoComplete="tel" /></label>
                </div>
                <label>Email nhận xác nhận<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
                <label>Ghi chú cho nhà hàng<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={300} placeholder="Ví dụ: ưu tiên bàn gần cửa sổ, có trẻ nhỏ, sinh nhật…" /><small className="character-count">{note.length}/300</small></label>

                <button className="primary-button full reservation-submit" disabled={busy || !eligibleTables.length}>
                  <CalendarDays aria-hidden="true" />
                  {busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt bàn'}
                </button>

                {result ? (
                  <div className="reservation-success" role="status" aria-live="polite">
                    <CheckCircle2 />
                    <div>
                      <strong>Yêu cầu đặt bàn đã được gửi thành công!</strong>
                      <p>Nhà hàng sẽ liên hệ xác nhận với bạn trong thời gian sớm nhất.</p>
                      <small>Mã yêu cầu: #{result.reservationCode}</small>
                    </div>
                  </div>
                ) : null}
              </section>
            </form>
          </section>

          <aside className="reservation-sidebar" aria-label="Tóm tắt yêu cầu đặt bàn">
            <section className="reservation-summary-card">
              <div className="reservation-summary-media">
                <img src={reservationImage} alt="Không gian bàn ăn tại nhà hàng" />
                <span><MapPin aria-hidden="true" /> Bàn đang chọn</span>
              </div>

              <div className="reservation-summary-body">
                {selectedTable ? (
                  <div className="reservation-summary-table">
                    <small>{selectedTable.areaName}</small>
                    <h2>{selectedTable.name}</h2>
                    <p>Phù hợp với nhóm của bạn và đang chờ nhà hàng xác nhận.</p>
                  </div>
                ) : (
                  <div className="reservation-table-empty">
                    <UsersRound aria-hidden="true" />
                    <h2>Chưa có bàn phù hợp</h2>
                    <p>Điều chỉnh số lượng khách để xem bàn khả dụng.</p>
                  </div>
                )}

                <dl className="reservation-summary-facts">
                  <div><dt><CalendarDays aria-hidden="true" /> Ngày</dt><dd>{displayDate(date)}</dd></div>
                  <div><dt><Clock3 aria-hidden="true" /> Giờ</dt><dd>{time}</dd></div>
                  <div><dt><UsersRound aria-hidden="true" /> Số khách</dt><dd>{numberOfGuests} khách</dd></div>
                  <div><dt><MapPin aria-hidden="true" /> Bàn</dt><dd>{selectedTable ? `${selectedTable.areaName} · ${selectedTable.name}` : 'Chưa chọn'}</dd></div>
                </dl>

                <div className="reservation-summary-support">
                  <h3><ShieldCheck aria-hidden="true" /> Nhà hàng sẽ xác nhận trước</h3>
                  <p>Yêu cầu đặt bàn chưa được xem là xác nhận cho đến khi nhà hàng phản hồi.</p>
                  <div>
                    <span><Clock3 aria-hidden="true" /><small>Giờ mở cửa</small><strong>{openingHours}</strong></span>
                    <span><Phone aria-hidden="true" /><small>Hotline</small><strong>{data.restaurant?.phoneNumber || 'Đang cập nhật'}</strong></span>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}