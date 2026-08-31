import { ArrowRight, CalendarDays, Clock3, MapPin, Sparkles, Star, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CustomerSiteBootstrap } from '../services/customerSite'
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

export default function HomePage({ data }: { data: CustomerSiteBootstrap }) {
  const restaurant = data.restaurant
  const featured = useMemo(
    () => data.menuItems.filter(item => item.isAvailable).slice(0, 5),
    [data.menuItems],
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const active = featured[activeIndex] ?? featured[0]

  useEffect(() => {
    if (featured.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveIndex(current => (current + 1) % featured.length)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [featured.length])

  const welcome = restaurant?.welcomeMessage
    || 'Món Việt được chuẩn bị mỗi ngày bằng nguyên liệu tươi, hương vị quen thuộc và cách phục vụ gọn gàng, hiện đại.'

  return (
    <main className="bistro-v2-home">
      <section className="bistro-v2-hero">
        <div className="bistro-v2-hero-copy">
          <span className="bistro-v2-eyebrow"><Sparkles /> Ẩm thực Việt tại Nha Trang</span>
          <h1>Hương vị thân quen,<br /><em>trình bày theo cách mới.</em></h1>
          <p>{welcome}</p>
          <div className="bistro-v2-hero-actions">
            <Button size="lg" onClick={() => navigate('/menu')}>
              Gọi món ngay <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/reservation')}>
              <CalendarDays /> Đặt bàn
            </Button>
          </div>
          <div className="bistro-v2-meta-row">
            <span><Clock3 />{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Đang cập nhật'}</span>
            <span><MapPin />{restaurant?.address || 'Nha Trang'}</span>
          </div>
        </div>

        <div className="bistro-v2-hero-showcase">
          <div className="bistro-v2-dish-orbit" aria-hidden="true" />
          <div className="bistro-v2-main-dish">
            <img src={active?.imageUrl || heroImage} alt={active?.name || 'Món Việt nổi bật'} />
            <div className="bistro-v2-price-pill">
              <small>Món nổi bật</small>
              <strong>{active ? currency(active.price, restaurant?.currency) : 'Đang cập nhật'}</strong>
            </div>
          </div>
          <div className="bistro-v2-active-copy">
            <span>{active?.menuCategoryName || 'Thực đơn hôm nay'}</span>
            <h2>{active?.name || 'Món Việt mỗi ngày'}</h2>
            <p>{active?.description || 'Chọn món trong thực đơn đang phục vụ hôm nay.'}</p>
          </div>
        </div>
      </section>

      {featured.length ? (
        <section className="bistro-v2-thumb-rail" aria-label="Món nổi bật">
          <div className="bistro-v2-thumb-list">
            {featured.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === activeIndex ? 'active' : ''}
                onClick={() => setActiveIndex(index)}
                aria-pressed={index === activeIndex}
              >
                <img src={item.imageUrl || heroImage} alt="" />
                <span><strong>{item.name}</strong><small>{currency(item.price, restaurant?.currency)}</small></span>
              </button>
            ))}
          </div>
          <div className="bistro-v2-review-note">
            <span className="bistro-v2-stars"><Star /><Star /><Star /><Star /><Star /></span>
            <p>Chọn món, đặt bàn hoặc mang về trong cùng một trải nghiệm.</p>
          </div>
        </section>
      ) : null}

      <section className="bistro-v2-popular">
        <div className="bistro-v2-section-heading">
          <div>
            <span><UtensilsCrossed /> Thực đơn đang phục vụ</span>
            <h2>Được chọn nhiều hôm nay</h2>
          </div>
          <Button variant="outline" onClick={() => navigate('/menu')}>Xem toàn bộ <ArrowRight /></Button>
        </div>

        <div className="bistro-v2-popular-grid">
          {data.menuItems.slice(0, 6).map((item, index) => (
            <article className="bistro-v2-popular-card" key={item.id}>
              <button type="button" className="bistro-v2-popular-media" onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}>
                <img src={item.imageUrl || heroImage} className={`fallback-crop crop-${index % 3 + 1}`} alt={item.name} />
              </button>
              <div className="bistro-v2-popular-body">
                <span>{item.menuCategoryName}</span>
                <h3>{item.name}</h3>
                <p>{item.description || 'Món ăn được chuẩn bị tươi mới trong ngày.'}</p>
                <div><strong>{currency(item.price, restaurant?.currency)}</strong><Button variant="ghost" size="sm" onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}>Chi tiết <ArrowRight /></Button></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bistro-v2-story">
        <div className="bistro-v2-story-media"><img src={reservationImage} alt="Không gian nhà hàng" /></div>
        <div className="bistro-v2-story-copy">
          <span>Đặt chỗ trước, đến nơi chỉ việc thưởng thức</span>
          <h2>Một bàn ăn phù hợp cho nhóm của bạn.</h2>
          <p>Chọn ngày, giờ, số khách và bàn còn phù hợp ngay trên website. Nhà hàng sẽ xác nhận trước khi bạn đến.</p>
          <div>
            <Button size="lg" onClick={() => navigate('/reservation')}>Đặt bàn ngay <ArrowRight /></Button>
            <Button size="lg" variant="ghost" onClick={() => navigate('/takeaway')}>Tôi muốn mang về</Button>
          </div>
        </div>
      </section>
    </main>
  )
}
