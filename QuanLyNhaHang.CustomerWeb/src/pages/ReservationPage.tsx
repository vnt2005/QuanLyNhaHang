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

function StepHeading({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <span className="grid size-9 shrink-0 place-items-center border border-foreground text-[10px] font-semibold tracking-wider">0{step}</span>
      <div>
        <h2 className="font-heading text-3xl leading-none tracking-[-0.03em]">{title}</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
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
    <main className="bg-background text-foreground">
      <section className="mx-auto w-[min(1440px,calc(100vw-48px))] py-14 sm:w-[min(1440px,calc(100vw-80px))] md:py-20">
        <header className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.24em] text-muted-foreground uppercase">Đặt bàn trước</p>
            <h1 className="mt-3 font-heading text-[clamp(4rem,7vw,7.5rem)] leading-[0.86] tracking-[-0.055em]">Một chỗ ngồi,<br /><span className="italic text-muted-foreground">đúng thời điểm.</span></h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground">Chọn lịch dùng bữa, bàn phù hợp và để lại thông tin liên hệ. Nhà hàng sẽ xác nhận trước giờ đến.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 border-l border-border pl-6 text-xs">
            <span><small className="block tracking-[0.14em] text-muted-foreground uppercase">Mở cửa</small><strong className="mt-2 block">{openingHours}</strong></span>
            <span><small className="block tracking-[0.14em] text-muted-foreground uppercase">Hotline</small><strong className="mt-2 block">{data.restaurant?.phoneNumber || 'Đang cập nhật'}</strong></span>
          </div>
        </header>

        {error ? <Alert variant="destructive" className="mt-8"><AlertTitle>Không thể gửi yêu cầu</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,.75fr)]">
          <form className="border border-border" onSubmit={submit}>
            <section className="border-b border-border p-6 sm:p-8">
              <StepHeading step={1} title="Lịch dùng bữa" description="Chọn số khách, ngày và khung giờ bạn muốn đến." />
              <div className="mt-8 grid gap-7 md:grid-cols-2">
                <div>
                  <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">Số khách</span>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickGuestCounts.map(value => <Button key={value} type="button" size="xs" variant={numberOfGuests === value ? 'default' : 'outline'} onClick={() => setNumberOfGuests(value)}>{value}</Button>)}
                    <select className="h-7 border border-border bg-background px-2 text-xs" value={quickGuestCountSet.has(numberOfGuests) ? '' : numberOfGuests} onChange={event => { if (event.target.value) setNumberOfGuests(Number(event.target.value)) }}>
                      <option value="">Khác</option>
                      {otherGuestCounts.map(value => <option value={value} key={value}>{value} khách</option>)}
                    </select>
                  </div>
                </div>
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Ngày đặt bàn<Input type="date" min={tomorrow()} value={date} onChange={event => setDate(event.target.value)} required className="normal-case tracking-normal" /></label>
              </div>

              <div className="mt-8 border-t border-border pt-7">
                <div className="flex items-end justify-between gap-4"><span className="text-[10px] font-semibold tracking-[0.14em] uppercase">Giờ dùng bữa</span><small className="text-xs text-muted-foreground">Đang chọn <strong className="text-foreground">{time}</strong></small></div>
                <div className="mt-3 flex flex-wrap gap-2">{timeOptions.map(value => <Button key={value} type="button" size="xs" variant={time === value ? 'default' : 'outline'} onClick={() => setTime(value)}>{value}</Button>)}</div>
                <label className="mt-5 grid max-w-56 gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Giờ khác<Input type="time" value={time} onChange={event => setTime(event.target.value)} required className="normal-case tracking-normal" /></label>
              </div>
            </section>

            <section className="border-b border-border p-6 sm:p-8">
              <StepHeading step={2} title="Bàn phù hợp" description={`${eligibleTables.length} bàn phù hợp với nhóm ${numberOfGuests} khách.`} />
              {eligibleTables.length ? (
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {eligibleTables.map(table => {
                    const selected = table.id === tableId
                    return <button key={table.id} className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 border p-4 text-left transition-colors ${selected ? 'border-foreground bg-muted/40' : 'border-border hover:border-foreground'}`} type="button" aria-pressed={selected} onClick={() => setTableId(table.id)}><MapPin className="size-4" /><span><small className="block text-[9px] tracking-[0.14em] text-muted-foreground uppercase">{table.areaName}</small><strong className="mt-1 block font-heading text-xl font-medium">{table.name}</strong><span className="mt-1 block text-xs text-muted-foreground">Tối đa {table.capacity} khách</span></span>{selected ? <CheckCircle2 className="size-4" /> : null}</button>
                  })}
                </div>
              ) : <Alert className="mt-8"><UsersRound /><AlertTitle>Chưa có bàn phù hợp</AlertTitle><AlertDescription>Hãy giảm số lượng khách hoặc liên hệ nhà hàng để được hỗ trợ.</AlertDescription></Alert>}
            </section>

            <section className="p-6 sm:p-8">
              <StepHeading step={3} title="Thông tin liên hệ" description="Nhà hàng dùng thông tin này để xác nhận yêu cầu đặt bàn." />
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Họ và tên<Input value={customerName} onChange={event => setCustomerName(event.target.value)} required minLength={2} autoComplete="name" className="normal-case tracking-normal" /></label>
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Số điện thoại<Input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required pattern={'[0-9 +\\(\\)\\-]{9,15}'} autoComplete="tel" className="normal-case tracking-normal" /></label>
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase sm:col-span-2">Email nhận xác nhận<Input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" className="normal-case tracking-normal" /></label>
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase sm:col-span-2">Ghi chú cho nhà hàng<Textarea value={note} onChange={event => setNote(event.target.value)} maxLength={300} placeholder="Ví dụ: ưu tiên bàn gần cửa sổ, có trẻ nhỏ, sinh nhật…" className="min-h-28 normal-case tracking-normal" /><small className="justify-self-end text-[10px] text-muted-foreground">{note.length}/300</small></label>
              </div>
              <Button className="mt-8 w-full" disabled={busy || !eligibleTables.length}>{busy ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu đặt bàn'}</Button>
              {result ? <Alert className="mt-6"><CheckCircle2 /><AlertTitle>Yêu cầu đã được gửi</AlertTitle><AlertDescription>Nhà hàng sẽ liên hệ xác nhận sớm nhất. Mã yêu cầu: #{result.reservationCode}</AlertDescription></Alert> : null}
            </section>
          </form>

          <aside className="h-fit border border-border xl:sticky xl:top-28">
            <div className="relative h-64 overflow-hidden bg-muted"><img src={reservationImage} alt="Không gian bàn ăn tại nhà hàng" className="size-full object-cover" /><span className="absolute bottom-4 left-4 border border-white/60 bg-black/45 px-2 py-1 text-[9px] font-semibold tracking-[0.14em] text-white uppercase">Bàn đang chọn</span></div>
            <div className="p-6">
              {selectedTable ? <div><small className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{selectedTable.areaName}</small><h2 className="mt-2 font-heading text-3xl">{selectedTable.name}</h2><p className="mt-3 text-xs leading-5 text-muted-foreground">Phù hợp với nhóm của bạn và đang chờ nhà hàng xác nhận.</p></div> : <div><h2 className="font-heading text-3xl">Chưa có bàn phù hợp</h2><p className="mt-3 text-xs leading-5 text-muted-foreground">Điều chỉnh số lượng khách để xem bàn khả dụng.</p></div>}
              <dl className="mt-7 grid gap-4 border-y border-border py-5 text-xs"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Ngày</dt><dd className="text-right font-semibold">{displayDate(date)}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Giờ</dt><dd className="font-semibold">{time}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Số khách</dt><dd className="font-semibold">{numberOfGuests} khách</dd></div><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Bàn</dt><dd className="text-right font-semibold">{selectedTable ? `${selectedTable.areaName} · ${selectedTable.name}` : 'Chưa chọn'}</dd></div></dl>
              <div className="mt-6 flex gap-3"><ShieldCheck className="mt-0.5 size-4" /><div><strong className="text-[10px] tracking-[0.14em] uppercase">Nhà hàng sẽ xác nhận trước</strong><p className="mt-2 text-xs leading-5 text-muted-foreground">Yêu cầu chỉ hoàn tất sau khi nhà hàng phản hồi.</p></div></div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5 text-xs"><span><Clock3 className="mb-2 size-4" /><small className="block text-muted-foreground">Mở cửa</small><strong className="mt-1 block">{openingHours}</strong></span><span><Phone className="mb-2 size-4" /><small className="block text-muted-foreground">Hotline</small><strong className="mt-1 block">{data.restaurant?.phoneNumber || 'Đang cập nhật'}</strong></span></div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
