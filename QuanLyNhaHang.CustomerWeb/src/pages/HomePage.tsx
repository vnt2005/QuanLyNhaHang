import { ArrowRight, CalendarDays, Clock3, MapPin, Phone } from 'lucide-react'
import type { CustomerSiteBootstrap, PublicMenuItem } from '../api/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../navigation'

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
    <>
      <section className="home-hero">
        <div className="home-hero-copy">
          <h1>Trọn vị Việt<br />trong từng khoảnh khắc</h1>
          <p>{welcome}</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => navigate('/menu')}>Xem thực đơn <ArrowRight /></button>
            <button className="secondary-button" type="button" onClick={() => navigate('/reservation')}>Đặt bàn <CalendarDays /></button>
          </div>
        </div>
        <div className="home-hero-media"><img src={heroImage} alt="Bàn ăn Việt với phở, bánh xèo và trà" /></div>
      </section>

      <section className="page-section featured-section">
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

      <section className="visit-band">
        <div className="visit-invitation">
          <div className="line-art-table" aria-hidden="true">♧</div>
          <div>
            <h2>Sẵn sàng đón bạn</h2>
            <p>Đặt bàn trước để nhà hàng chuẩn bị không gian và món ngon chu đáo cho bạn.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/reservation')}>Đặt bàn ngay <CalendarDays /></button>
          </div>
        </div>
        <div className="restaurant-facts">
          <h2>Thông tin nhà hàng</h2>
          <div className="facts-grid">
            <p><MapPin /><span><small>Địa chỉ</small><strong>{restaurant?.address || 'Đang cập nhật'}</strong></span></p>
            <p><Clock3 /><span><small>Giờ mở cửa</small><strong>{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Đang cập nhật'}</strong></span></p>
            <p><Phone /><span><small>Điện thoại</small><strong>{restaurant?.phoneNumber || 'Đang cập nhật'}</strong></span></p>
          </div>
        </div>
      </section>
    </>
  )
}
