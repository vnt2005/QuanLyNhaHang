import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CustomerSiteBootstrap, PublicMenuItem } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import reservationImage from '../assets/reservation-dining-room.webp'
import { navigate } from '../utils/navigation'

function currency(value: number, code = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function FeaturedDish({ item, index, currencyCode }: { item: PublicMenuItem; index: number; currencyCode: string }) {
  return (
    <button
      type="button"
      className="group grid min-w-0 cursor-pointer grid-rows-[minmax(240px,34vw)_auto] border-0 bg-transparent p-0 text-left md:grid-rows-[360px_auto]"
      onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
      aria-label={`Xem chi tiết ${item.name}`}
    >
      <span className="relative block overflow-hidden bg-muted">
        <img
          src={item.imageUrl || heroImage}
          className={`fallback-crop crop-${index + 1} size-full object-cover transition-transform duration-500 group-hover:scale-[1.025]`}
          alt={item.name}
          loading="lazy"
          decoding="async"
        />
        <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" aria-hidden="true" />
      </span>
      <span className="grid gap-3 border-x border-b border-border px-5 py-5 md:px-6 md:py-6">
        <span className="flex items-start justify-between gap-4">
          <span className="font-heading text-2xl leading-none text-foreground md:text-3xl">{item.name}</span>
          <strong className="shrink-0 text-xs font-semibold tracking-widest text-foreground uppercase">
            {currency(item.price, currencyCode)}
          </strong>
        </span>
        <span className="line-clamp-2 max-w-[52ch] text-sm leading-6 text-muted-foreground">
          {item.description || `Món ${item.menuCategoryName.toLocaleLowerCase('vi')} được chuẩn bị trong ngày.`}
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase">
          Xem món <ArrowRight data-icon="inline-end" />
        </span>
      </span>
    </button>
  )
}

export default function HomePage({ data }: { data: CustomerSiteBootstrap }) {
  const restaurant = data.restaurant
  const featured = data.menuItems.filter(item => item.isAvailable).slice(0, 3)
  const welcome = restaurant?.welcomeMessage
    || 'Món Việt được chuẩn bị mỗi ngày từ nguyên liệu tươi, kỹ thuật chỉn chu và những hương vị quen thuộc.'

  return (
    <main className="bg-background text-foreground">
      <section className="grid min-h-[calc(100vh-88px)] border-b border-border lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)]">
        <div className="flex items-center px-6 py-16 sm:px-10 lg:px-[max(56px,calc((100vw-min(1440px,100vw-96px))/2))] lg:py-24">
          <div className="max-w-3xl">
            <p className="mb-8 text-xs font-semibold tracking-[0.28em] text-muted-foreground uppercase">
              Ẩm thực Việt · Nha Trang
            </p>
            <h1 className="font-heading text-[clamp(4rem,8.2vw,9rem)] leading-[0.82] tracking-[-0.055em] text-foreground">
              Trọn vị Việt,
              <span className="mt-3 block italic text-muted-foreground">theo cách riêng.</span>
            </h1>
            <p className="mt-10 max-w-xl text-base leading-8 text-muted-foreground md:text-lg">{welcome}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button size="lg" type="button" onClick={() => navigate('/menu')}>
                Xem thực đơn <ArrowRight data-icon="inline-end" />
              </Button>
              <Button size="lg" variant="outline" type="button" onClick={() => navigate('/reservation')}>
                Đặt bàn <CalendarDays data-icon="inline-end" />
              </Button>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-6 text-xs tracking-wide text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Clock3 aria-hidden="true" className="size-4" />
                {restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Giờ mở cửa đang cập nhật'}
              </span>
              <span className="inline-flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4" />
                {restaurant?.address || 'Địa chỉ đang cập nhật'}
              </span>
            </div>
          </div>
        </div>

        <div className="relative min-h-[52vh] overflow-hidden border-t border-border bg-muted lg:min-h-0 lg:border-t-0 lg:border-l">
          <img src={reservationImage} alt="Không gian nhà hàng" className="absolute inset-0 size-full object-cover" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/5" aria-hidden="true" />
          <div className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-4 text-white sm:right-10 sm:bottom-10 sm:left-10">
            <p className="max-w-sm text-xs leading-5 tracking-[0.16em] uppercase">Một bữa ăn được chuẩn bị vừa đủ để hương vị là điều được nhớ đến.</p>
            <span className="font-heading text-5xl italic">VNT</span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-[min(1440px,calc(100vw-48px))] py-20 sm:w-[min(1440px,calc(100vw-80px))] md:py-28">
        <header className="mb-12 grid gap-6 border-b border-border pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[0.25em] text-muted-foreground uppercase">Chọn từ bếp hôm nay</p>
            <h2 className="font-heading text-5xl leading-none tracking-[-0.035em] md:text-7xl">Món được yêu thích</h2>
          </div>
          <Button variant="link" className="justify-start px-0 md:justify-end" type="button" onClick={() => navigate('/menu')}>
            Toàn bộ thực đơn <ArrowRight data-icon="inline-end" />
          </Button>
        </header>

        {featured.length ? (
          <div className="grid gap-6 lg:grid-cols-3">
            {featured.map((item, index) => (
              <FeaturedDish key={item.id} item={item} index={index} currencyCode={restaurant?.currency || 'VND'} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
            Thực đơn đang được nhà hàng cập nhật.
          </div>
        )}
      </section>

      <section className="border-y border-border bg-muted/35">
        <div className="mx-auto grid w-[min(1440px,calc(100vw-48px))] gap-10 py-16 sm:w-[min(1440px,calc(100vw-80px))] md:grid-cols-[1.1fr_0.9fr] md:items-end md:py-20">
          <div>
            <p className="mb-4 text-xs font-semibold tracking-[0.25em] text-muted-foreground uppercase">Dành thời gian cho một bữa ăn tử tế</p>
            <h2 className="max-w-4xl font-heading text-4xl leading-[1.05] tracking-[-0.03em] sm:text-5xl md:text-6xl">
              Đặt bàn trước hoặc chọn món mang về — phần còn lại để nhà hàng chuẩn bị.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Button size="lg" type="button" onClick={() => navigate('/reservation')}>Đặt bàn</Button>
            <Button size="lg" variant="outline" type="button" onClick={() => navigate('/takeaway')}>Đặt món mang về</Button>
          </div>
        </div>
      </section>
    </main>
  )
}
