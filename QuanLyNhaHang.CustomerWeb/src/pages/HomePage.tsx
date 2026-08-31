import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  UtensilsCrossed,
} from 'lucide-react'
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

function DishCard({ item, index, currencyCode }: { item: PublicMenuItem; index: number; currencyCode: string }) {
  return (
    <article className="featured-dish">
      <div className="featured-dish-media">
        <img
          src={item.imageUrl || heroImage}
          className={`fallback-crop crop-${index + 1}`}
          alt={item.name}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div>
        <h3>{item.name}</h3>
        <p>{item.description || `Món ${item.menuCategoryName.toLocaleLowerCase('vi')} được chuẩn bị trong ngày.`}</p>
        <strong>{currency(item.price, currencyCode)}</strong>
      </div>
    </article>
  )
}

export default function HomePage({ data }: { data: CustomerSiteBootstrap }) {
  const restaurant = data.restaurant
  const featured = data.menuItems.slice(0, 3)
  const welcome = restaurant?.welcomeMessage
    || 'Món ngon được chuẩn bị mỗi ngày từ những nguyên liệu tươi và câu chuyện thân quen.'

  return (
    <main className="home-page">
      <section className="home-hero home-premium-hero">
        <div className="home-premium-media" aria-hidden="true">
          <img src={reservationImage} alt="" fetchPriority="high" decoding="async" />
        </div>
        <div className="home-premium-shell">
          <div className="home-hero-copy home-premium-copy">
            <span className="home-hero-kicker"><UtensilsCrossed aria-hidden="true" /> Hương vị Việt, phục vụ theo cách của bạn</span>
            <h1>Trọn vị Việt<br /><span>trong từng khoảnh khắc</span></h1>
            <p>{welcome}</p>
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={() => navigate('/menu')}>Xem thực đơn <ArrowRight /></button>
              <button className="secondary-button" type="button" onClick={() => navigate('/reservation')}>Đặt bàn <CalendarDays /></button>
            </div>
            <div className="home-hero-meta">
              <span><Clock3 aria-hidden="true" />{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Giờ mở cửa đang cập nhật'}</span>
              <span><MapPin aria-hidden="true" />{restaurant?.address || 'Địa chỉ đang cập nhật'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section featured-section home-featured-section">
        <div className="section-heading horizontal">
          <div><h2>Món được yêu thích</h2><p>Một vài gợi ý từ thực đơn đang phục vụ hôm nay.</p></div>
          <button className="text-link" type="button" onClick={() => navigate('/menu')}>Xem toàn bộ thực đơn <ArrowRight /></button>
        </div>
        {featured.length ? (
          <div className="featured-rail">
            {featured.map((item, index) => <DishCard key={item.id} item={item} index={index} currencyCode={restaurant?.currency || 'VND'} />)}
          </div>
        ) : (
          <p className="quiet-empty">Thực đơn đang được nhà hàng cập nhật.</p>
        )}
      </section>
    </main>
  )
}
