import { Clock3, Mail, MapPin, Phone, UtensilsCrossed } from 'lucide-react'
import type { MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { PublicRestaurant } from '../services/customerSite'
import { navigate } from '../utils/navigation'

export default function SiteFooter({ restaurant }: { restaurant: PublicRestaurant | null; home?: boolean }) {
  const name = restaurant?.restaurantName || 'Nhà Hàng'

  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(path)
  }

  return (
    <footer className="mt-auto border-t border-border bg-foreground text-background">
      <div className="mx-auto w-[min(1440px,calc(100vw-48px))] sm:w-[min(1440px,calc(100vw-80px))]">
        <div className="grid gap-12 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-20 lg:grid-cols-[1.2fr_0.65fr_0.9fr]">
          <div className="max-w-xl">
            <a href="/" className="inline-flex items-center gap-3 text-background no-underline" onClick={event => follow(event, '/')}>
              <span className="grid size-11 place-items-center border border-background/30">
                {restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="" className="size-full object-contain p-1" /> : <UtensilsCrossed aria-hidden="true" className="size-4" />}
              </span>
              <span>
                <strong className="block font-heading text-3xl font-medium leading-none">{name}</strong>
                <small className="mt-2 block text-[10px] font-semibold tracking-[0.28em] text-background/60 uppercase">Ẩm thực Việt</small>
              </span>
            </a>
            <p className="mt-7 max-w-lg font-heading text-3xl leading-[1.18] text-background/90 md:text-4xl">
              {restaurant?.welcomeMessage || 'Một bữa ăn chỉn chu, một khoảng thời gian vừa đủ để ở lại với hương vị.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate('/reservation')}>Đặt bàn</Button>
              <Button type="button" variant="outline" className="border-background/35 bg-transparent text-background hover:bg-background hover:text-foreground" onClick={() => navigate('/menu')}>Xem thực đơn</Button>
            </div>
          </div>

          <div>
            <p className="mb-5 text-[11px] font-semibold tracking-[0.24em] text-background/50 uppercase">Khám phá</p>
            <nav className="grid gap-1" aria-label="Điều hướng cuối trang">
              {[
                ['Thực đơn', '/menu'],
                ['Đặt món mang về', '/takeaway'],
                ['Đặt bàn', '/reservation'],
                ['Đơn của tôi', '/orders'],
                ['Tài khoản', '/account'],
              ].map(([label, path]) => (
                <a key={path} href={path} onClick={event => follow(event, path)} className="w-fit py-2 text-sm text-background/75 no-underline transition-colors hover:text-background">
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <p className="mb-5 text-[11px] font-semibold tracking-[0.24em] text-background/50 uppercase">Nhà hàng</p>
            <div className="grid gap-4 text-sm text-background/75">
              <p className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{restaurant?.address || 'Địa chỉ đang cập nhật'}</span></p>
              <p className="flex gap-3"><Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Giờ mở cửa đang cập nhật'}</span></p>
              <p className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{restaurant?.phoneNumber ? <a className="text-inherit no-underline hover:text-background" href={`tel:${restaurant.phoneNumber}`}>{restaurant.phoneNumber}</a> : <span>Đang cập nhật</span>}</p>
              {restaurant?.email ? <p className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><a className="break-all text-inherit no-underline hover:text-background" href={`mailto:${restaurant.email}`}>{restaurant.email}</a></p> : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-background/15 py-5 text-[11px] tracking-wide text-background/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {name}. Mọi quyền được bảo lưu.</span>
          <span>Ẩm thực Việt · Nha Trang</span>
        </div>
      </div>
    </footer>
  )
}
