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
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { CustomerSession } from '../services/customerAuth'
import {
  createCustomerReservation,
  type CustomerReservationResult,
  type CustomerSiteBootstrap,
} from '../services/customerSite'
import reservationImage from '../assets/reservation-dining-room.webp'

const quickGuestCounts = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20]
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

function SectionHeading({ icon, step, children }: { icon: ReactNode; step: number; children: ReactNode }) {
  return (
    <div className="reservation-section-heading">
      <span className="reservation-section-icon" aria-hidden="true">{icon}</span>
      <h2><span>{step}.</span> {children}</h2>
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
        <div className="reservation-layout">
          <section className="reservation-content">
            <header className="reservation-card-intro">
              <h1>Đặt bàn cho dịp của bạn</h1>
              <p className="page-lead">Chọn thời gian và không gian phù hợp. Nhà hàng sẽ tiếp nhận và xác nhận yêu cầu của bạn.</p>
            </header>

            {error ? <div className="form-notice error reservation-form-notice" role="alert">{error}</div> : null}

            <form className="reservation-form" onSubmit={submit}>
              <section className="reservation-form-section" aria-labelledby="reservation-customer-heading">
                <div id="reservation-customer-heading">
                  <SectionHeading icon={<UserRound />} step={1}>Thông tin khách hàng</SectionHeading>
                </div>
                <div className="form-row">
                  <label>Họ và tên *<input value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} autoComplete="name" /></label>
                  <label>Số điện thoại *<input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required pattern={'[0-9 +\\(\\)\\-]{9,15}'} autoComplete="tel" /></label>
                </div>
                <label>Email nhận xác nhận<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
              </section>

              <section className="reservation-form-section" aria-labelledby="reservation-time-heading">
                <div id="reservation-time-heading">
                  <SectionHeading icon={<CalendarDays />} step={2}>Thời gian &amp; số lượng khách</SectionHeading>
                </div>

                <div className="reservation-guest-picker">
                  <p>Số lượng khách: <strong>{numberOfGuests} khách</strong></p>
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

                <div className="form-row reservation-date-time-row">
                  <label>Ngày đặt bàn *<input type="date" min={tomorrow()} value={date} onChange={event => setDate(event.target.value)} required /></label>
                  <label>Giờ đã chọn *<input type="time" value={time} onChange={event => setTime(event.target.value)} required /></label>
                </div>

                {timeOptions.length ? (
                  <div className="reservation-time-picker">
                    <p>Chọn nhanh giờ dùng bữa:</p>
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
                  </div>
                ) : null}
              </section>

              <section className="reservation-form-section reservation-final-section" aria-labelledby="reservation-table-heading">
                <div id="reservation-table-heading">
                  <SectionHeading icon={<MapPin />} step={3}>Chọn khu vực &amp; bàn</SectionHeading>
                </div>
                <label>Khu vực / bàn *
                  <select value={tableId} onChange={event => setTableId(event.target.value)} required disabled={!eligibleTables.length}>
                    {eligibleTables.length ? eligibleTables.map(table => <option key={table.id} value={table.id}>{table.areaName} – {table.name} (tối đa {table.capacity} khách)</option>) : <option value="">Không có bàn phù hợp</option>}
                  </select>
                </label>
                <label>Ghi chú<textarea value={note} onChange={event => setNote(event.target.value)} maxLength={300} placeholder="Ví dụ: ưu tiên bàn gần cửa sổ, có trẻ nhỏ…" /><small className="character-count">{note.length}/300</small></label>
                <button className="primary-button full reservation-submit" disabled={busy || !eligibleTables.length}>
                  <CalendarDays aria-hidden="true" />
                  {busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt bàn'}
                </button>

                {result ? (
                  <div className="reservation-success" role="status" aria-live="polite">
                    <CheckCircle2 />
                    <div><strong>Yêu cầu đặt bàn đã được gửi thành công!</strong><p>Nhà hàng sẽ liên hệ xác nhận với bạn trong thời gian sớm nhất.</p><small>Mã yêu cầu: #{result.reservationCode}</small></div>
                  </div>
                ) : null}
              </section>
            </form>
          </section>

          <aside className="reservation-sidebar" aria-label="Bàn đang chọn và hỗ trợ đặt bàn">
            <section className="reservation-table-card">
              <div className="reservation-table-media">
                <img src={reservationImage} alt="Không gian bàn ăn tại nhà hàng" />
                <span><MapPin aria-hidden="true" /> Bàn đang chọn</span>
              </div>
              <div className="reservation-table-body">
                {selectedTable ? (
                  <>
                    <small>{selectedTable.areaName}</small>
                    <h2>{selectedTable.name}</h2>
                    <p>Bàn phù hợp với số khách bạn đã chọn và đang chờ nhà hàng xác nhận.</p>
                    <dl>
                      <div><dt>Số khách đã chọn</dt><dd>{numberOfGuests} khách</dd></div>
                      <div><dt>Sức chứa tối đa</dt><dd>{selectedTable.capacity} khách</dd></div>
                    </dl>
                  </>
                ) : (
                  <div className="reservation-table-empty">
                    <UsersRound aria-hidden="true" />
                    <h2>Chưa có bàn phù hợp</h2>
                    <p>Hãy giảm số lượng khách hoặc liên hệ nhà hàng để được hỗ trợ.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="reservation-support-card">
              <h2><ShieldCheck aria-hidden="true" /> Thông tin đặt bàn</h2>
              <div className="reservation-contact-row">
                <Clock3 aria-hidden="true" />
                <div><span>Giờ mở cửa</span><strong>{openingTime && closingTime ? `${openingTime} – ${closingTime}` : 'Đang cập nhật'}</strong></div>
              </div>
              <div className="reservation-contact-row">
                <Phone aria-hidden="true" />
                <div><span>Hỗ trợ đặt bàn</span><strong>{data.restaurant?.phoneNumber || 'Đang cập nhật'}</strong></div>
              </div>
              <ul>
                <li><CheckCircle2 aria-hidden="true" /> Nhà hàng sẽ liên hệ xác nhận yêu cầu.</li>
                <li><CheckCircle2 aria-hidden="true" /> Hỗ trợ nhóm đông người và dịp đặc biệt.</li>
                <li><CheckCircle2 aria-hidden="true" /> Ghi chú được chuyển đến bộ phận phục vụ.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
