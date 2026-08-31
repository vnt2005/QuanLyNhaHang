import { CalendarDays, CheckCircle2, Clock3, MapPin, Phone, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CustomerSession } from '../services/customerAuth'
import { createCustomerReservation, type CustomerReservationResult, type CustomerSiteBootstrap } from '../services/customerSite'
import reservationImage from '../assets/reservation-dining-room.webp'

const quickGuestCounts = [1, 2, 3, 4, 5, 6, 8, 10]
const quickGuestCountSet = new Set(quickGuestCounts)
const otherGuestCounts = Array.from({ length: 20 }, (_, index) => index + 1).filter(value => !quickGuestCountSet.has(value))
const preferredReservationTimes = ['11:00', '11:30', '12:00', '12:30', '13:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30']

function tomorrow() {
  const date = new Date(); date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
  const hours = Number(match[1]); const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function clockValue(value?: string | null) {
  const minutes = clockMinutes(value)
  if (minutes == null) return null
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function suggestedTimes(openingTime?: string | null, closingTime?: string | null) {
  const opening = clockMinutes(openingTime); const closing = clockMinutes(closingTime)
  if (opening == null || closing == null || opening >= closing) return preferredReservationTimes
  const preferred = preferredReservationTimes.filter(value => { const minutes = clockMinutes(value); return minutes != null && minutes >= opening && minutes <= closing })
  if (preferred.length >= 4) return preferred
  const fallback: string[] = []
  for (let minutes = Math.ceil(opening / 30) * 30; minutes <= closing && fallback.length < 12; minutes += 60) fallback.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`)
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
    setBusy(true); setError(''); setResult(null)
    try {
      const reservationTime = new Date(`${date}T${time}:00`).toISOString()
      const response = await createCustomerReservation({ restaurantTableId: tableId, customerName, phoneNumber, email: email.trim() || null, numberOfGuests, reservationTime, note: note.trim() || null }, session?.token)
      setResult(response.data)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không gửi được yêu cầu đặt bàn.') }
    finally { setBusy(false) }
  }

  return (
    <main className="sera-page">
      <section className="grid min-h-[560px] border-y border-border lg:grid-cols-[.92fr_1.08fr]">
        <div className="relative min-h-[420px] overflow-hidden bg-muted lg:min-h-full"><img src={reservationImage} alt="Không gian nhà hàng" className="absolute inset-0 h-full w-full object-cover" /></div>
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <p className="sera-kicker">Đặt bàn trực tuyến</p>
          <h1 className="sera-title mt-3">Giữ một chỗ cho bữa ăn sắp tới.</h1>
          <p className="sera-copy mt-5">Chọn lịch, số khách và bàn còn đủ điều kiện. Nhà hàng sẽ xác nhận lại trước giờ dùng bữa.</p>
          <div className="mt-8 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
            <div className="flex gap-3"><Clock3 className="size-5 text-accent" /><div><small className="text-muted-foreground">Mở cửa</small><strong className="block">{openingHours}</strong></div></div>
            <div className="flex gap-3"><Phone className="size-5 text-accent" /><div><small className="text-muted-foreground">Hotline</small><strong className="block">{data.restaurant?.phoneNumber || 'Đang cập nhật'}</strong></div></div>
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-12 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit}>
          <header className="flex flex-wrap items-end justify-between gap-5 border-b border-border pb-5"><div><p className="sera-kicker">Thông tin đặt bàn</p><h2 className="font-heading text-4xl">Chọn lịch dùng bữa</h2></div><div className="flex items-center gap-3 text-sm"><CalendarDays className="size-5 text-accent" /><span><small className="block text-muted-foreground">{displayDate(date)}</small><strong>{time} · {numberOfGuests} khách</strong></span></div></header>
          {error ? <Alert variant="destructive" className="mt-6"><AlertTitle>Không thể gửi yêu cầu</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

          <section className="sera-panel">
            <p className="sera-kicker">01 · Thời gian & số khách</p>
            <h3 className="mt-2 text-3xl">Khi nào bạn muốn đến?</h3>
            <div className="sera-field-grid mt-6">
              <div className="sera-field"><span>Số khách</span><div className="sera-choice-row">{quickGuestCounts.map(value => <Button key={value} type="button" size="sm" variant={numberOfGuests === value ? 'default' : 'outline'} onClick={() => setNumberOfGuests(value)}>{value}</Button>)}</div><select className="border-b border-border bg-transparent py-2 text-foreground" value={quickGuestCountSet.has(numberOfGuests) ? '' : numberOfGuests} onChange={event => { if (event.target.value) setNumberOfGuests(Number(event.target.value)) }}><option value="">Số khách khác</option>{otherGuestCounts.map(value => <option value={value} key={value}>{value} khách</option>)}</select></div>
              <label className="sera-field">Ngày đến<Input type="date" min={tomorrow()} value={date} onChange={event => setDate(event.target.value)} required /></label>
              <div className="sera-field wide"><span>Khung giờ</span><div className="sera-choice-row">{timeOptions.map(value => <Button key={value} type="button" size="sm" variant={time === value ? 'default' : 'outline'} onClick={() => setTime(value)}>{value}</Button>)}</div><label className="sera-field mt-2">Giờ khác<Input type="time" value={time} onChange={event => setTime(event.target.value)} required /></label></div>
            </div>
          </section>

          <section className="sera-panel">
            <p className="sera-kicker">02 · Chọn bàn</p>
            <h3 className="mt-2 text-3xl">{eligibleTables.length} bàn phù hợp</h3>
            {eligibleTables.length ? <div className="mt-6 grid gap-0 border-t border-border sm:grid-cols-2">{eligibleTables.map(table => { const selected = table.id === tableId; return <button key={table.id} type="button" className={`relative flex min-h-28 flex-col items-start border-b border-r border-border p-4 text-left transition-colors ${selected ? 'bg-muted' : 'bg-transparent hover:bg-muted/60'}`} onClick={() => setTableId(table.id)}><small className="sera-kicker">{table.areaName}</small><strong className="mt-2 font-heading text-2xl">{table.name}</strong><span className="mt-auto text-xs text-muted-foreground">Tối đa {table.capacity} khách</span>{selected ? <CheckCircle2 className="absolute right-4 top-4 size-5 text-accent" /> : null}</button> })}</div> : <Alert className="mt-5"><UsersRound /><AlertTitle>Chưa có bàn phù hợp</AlertTitle><AlertDescription>Giảm số khách hoặc liên hệ nhà hàng để được hỗ trợ.</AlertDescription></Alert>}
          </section>

          <section className="sera-panel">
            <p className="sera-kicker">03 · Thông tin liên hệ</p>
            <h3 className="mt-2 text-3xl">Để nhà hàng xác nhận với bạn</h3>
            <div className="sera-field-grid mt-6"><label className="sera-field">Họ và tên<Input value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} autoComplete="name" /></label><label className="sera-field">Số điện thoại<Input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required pattern={'[0-9 +\\(\\)\\-]{9,15}'} autoComplete="tel" /></label><label className="sera-field wide">Email<Input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label><label className="sera-field wide">Ghi chú<Textarea value={note} onChange={event => setNote(event.target.value)} maxLength={300} placeholder="Ví dụ: ưu tiên gần cửa sổ, có trẻ nhỏ, sinh nhật…" /><small className="text-right text-muted-foreground">{note.length}/300</small></label></div>
          </section>

          {result ? <Alert className="mt-6"><CheckCircle2 /><AlertTitle>Yêu cầu đã được gửi</AlertTitle><AlertDescription>Nhà hàng sẽ liên hệ xác nhận. Mã yêu cầu: #{result.reservationCode}</AlertDescription></Alert> : null}
        </form>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border-y border-border py-6"><p className="sera-kicker">Tóm tắt</p><div className="mt-5 grid gap-4 text-sm"><span className="flex items-start gap-3"><CalendarDays className="size-4 text-accent" /><span><small className="block text-muted-foreground">Ngày</small><strong>{displayDate(date)}</strong></span></span><span className="flex items-start gap-3"><Clock3 className="size-4 text-accent" /><span><small className="block text-muted-foreground">Giờ</small><strong>{time}</strong></span></span><span className="flex items-start gap-3"><UsersRound className="size-4 text-accent" /><span><small className="block text-muted-foreground">Số khách</small><strong>{numberOfGuests}</strong></span></span><span className="flex items-start gap-3"><MapPin className="size-4 text-accent" /><span><small className="block text-muted-foreground">Bàn</small><strong>{selectedTable ? `${selectedTable.areaName} · ${selectedTable.name}` : 'Chưa chọn'}</strong></span></span></div><Button className="mt-6 w-full" size="lg" disabled={busy || !eligibleTables.length} onClick={() => document.querySelector<HTMLFormElement>('main.sera-page form')?.requestSubmit()}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu đặt bàn'}</Button></div>
          <div className="mt-5 flex gap-3 text-xs text-muted-foreground"><ShieldCheck className="size-5 shrink-0 text-accent" /><span><strong className="block text-foreground">Nhà hàng sẽ xác nhận trước.</strong>Yêu cầu chỉ hoàn tất sau khi nhà hàng phản hồi.</span></div>
        </aside>
      </section>
    </main>
  )
}
