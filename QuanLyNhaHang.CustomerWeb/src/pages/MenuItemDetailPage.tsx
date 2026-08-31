import { ArrowRight, CalendarDays, ChevronLeft, Minus, Plus, QrCode, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../utils/navigation'
import {
  addTakeawayItem,
  MAX_TAKEAWAY_ITEM_QUANTITY,
} from '../utils/takeawayCart'

function currency(value: number, code: string) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function MenuItemDetailPage({
  data,
  itemId,
}: {
  data: CustomerSiteBootstrap
  itemId: string
}) {
  const item = data.menuItems.find(menuItem => menuItem.id === itemId)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  if (!item) {
    return (
      <main className="mx-auto w-[min(1100px,calc(100vw-48px))] py-20 sm:w-[min(1100px,calc(100vw-80px))]">
        <Button variant="link" className="px-0" type="button" onClick={() => navigate('/menu')}><ChevronLeft data-icon="inline-start" /> Quay lại thực đơn</Button>
        <div className="mt-10 border border-border px-8 py-20 text-center">
          <h1 className="font-heading text-5xl tracking-[-0.04em]">Không tìm thấy món ăn</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground">Món này có thể đã ngừng phục vụ hoặc đường dẫn không còn hợp lệ.</p>
          <Button className="mt-8" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</Button>
        </div>
      </main>
    )
  }

  function addToTakeaway(goToCart: boolean) {
    const cart = addTakeawayItem(item!.id, quantity)
    const quantityInCart = cart[item!.id] || 0
    setMessage(`Giỏ mang về hiện có ${quantityInCart} phần ${item!.name}.`)
    if (goToCart) navigate('/takeaway')
  }

  return (
    <main className="bg-background text-foreground">
      <div className="mx-auto w-[min(1440px,calc(100vw-48px))] py-10 sm:w-[min(1440px,calc(100vw-80px))] md:py-16">
        <Button variant="link" className="mb-8 px-0" type="button" onClick={() => navigate('/menu')}><ChevronLeft data-icon="inline-start" /> Quay lại thực đơn</Button>

        <section className="grid overflow-hidden border border-border lg:grid-cols-[1.08fr_0.92fr]">
          <div className="min-h-[52vh] bg-muted lg:min-h-[720px]">
            <img src={item.imageUrl || heroImage} alt={item.name} className="size-full object-cover" />
          </div>

          <div className="flex flex-col p-7 sm:p-10 lg:p-14">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{item.menuCategoryName}</span>
                <Badge variant={item.isAvailable ? 'secondary' : 'destructive'}>{item.isAvailable ? 'Còn món' : 'Tạm hết'}</Badge>
              </div>
              <h1 className="mt-6 font-heading text-[clamp(3.5rem,5.5vw,6.5rem)] leading-[0.88] tracking-[-0.055em]">{item.name}</h1>
              <p className="mt-7 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>
              <strong className="mt-8 block text-sm font-semibold tracking-[0.14em] uppercase">{currency(item.price, data.restaurant?.currency || 'VND')}</strong>
            </div>

            {item.isAvailable ? (
              <div className="mt-10 border-y border-border py-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-heading text-3xl">Mang về</h2>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Mỗi món tối đa {MAX_TAKEAWAY_ITEM_QUANTITY} phần trong một đơn.</p>
                  </div>
                  <div className="flex items-center border border-border">
                    <button className="grid size-10 place-items-center disabled:opacity-35" type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus className="size-3.5" /></button>
                    <span className="grid min-w-12 place-items-center border-x border-border text-sm font-semibold">{quantity}</span>
                    <button className="grid size-10 place-items-center disabled:opacity-35" type="button" aria-label="Tăng số lượng" disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY} onClick={() => setQuantity(value => Math.min(MAX_TAKEAWAY_ITEM_QUANTITY, value + 1))}><Plus className="size-3.5" /></button>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="outline" type="button" onClick={() => addToTakeaway(false)}><ShoppingBag data-icon="inline-start" /> Thêm vào giỏ</Button>
                  <Button type="button" onClick={() => addToTakeaway(true)}>Đặt mang về ngay <ArrowRight data-icon="inline-end" /></Button>
                </div>
                {message ? <div className="mt-5 border-l-2 border-foreground pl-4 text-xs leading-5 text-muted-foreground" role="status">{message} <button type="button" className="ml-2 font-semibold text-foreground underline underline-offset-4" onClick={() => navigate('/takeaway')}>Xem giỏ</button></div> : null}
              </div>
            ) : null}

            <div className="mt-auto pt-9">
              <div className="flex gap-4 border-b border-border pb-7">
                <QrCode className="mt-1 size-5 shrink-0" aria-hidden="true" />
                <div>
                  <strong className="text-xs tracking-[0.14em] uppercase">Ăn tại quán?</strong>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">Quét mã QR đặt trên bàn để gọi món đúng bàn. Đơn mang về không cần QR.</p>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button variant="outline" type="button" onClick={() => navigate('/menu')}>Xem món khác</Button>
                <Button variant="ghost" type="button" onClick={() => navigate('/reservation')}>Đặt bàn <CalendarDays data-icon="inline-end" /></Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
