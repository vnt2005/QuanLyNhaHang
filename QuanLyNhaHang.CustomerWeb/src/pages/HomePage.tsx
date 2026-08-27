import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Headphones,
  MapPin,
  Phone,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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

function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

  const [bookingDate, setBookingDate] = useState(tomorrow)
  const [bookingTime, setBookingTime] = useState('19:00')
  const [guestCount, setGuestCount] = useState(4)
  const [areaName, setAreaName] = useState('')

  const availableAreas = useMemo(() => {
    const names = data.reservationTables
      .filter(table => table.capacity >= guestCount)
      .map(table => table.areaName)
      .filter(Boolean)
    return Array.from(new Set(names)).sort((left, right) => left.localeCompare(right, 'vi'))
  }, [data.reservationTables, guestCount])

  useEffect(() => {
    if (areaName && !availableAreas.includes(areaName)) setAreaName('')
  }, [areaName, availableAreas])

  function continueReservation() {
    const query = new URLSearchParams({
      date: bookingDate,
      time: bookingTime,
      guests: String(guestCount),
    })
    if (areaName) query.set('area', areaName)
    navigate(`/reservation?${query.toString()}`)
  }

  const serviceHighlights = [
    {
      icon: <UtensilsCrossed aria-hidden="true" />,
      title: 'Món Việt mỗi ngày',
      text: 'Khám phá thực đơn đang phục vụ và chọn món theo sở thích.',
    },
    {
      icon: <CalendarDays aria-hidden="true" />,
      title: 'Đặt bàn chủ động',
      text: 'Chọn ngày, giờ và số khách trước khi đến nhà hàng.',
    },
    {
      icon: <ShoppingBag aria-hidden="true" />,
      title: 'Mang về tiện lợi',
      text: 'Đặt món mang về và theo dõi đơn ngay trên website.',
    },
    {
      icon: <Headphones aria-hidden="true" />,
      title: 'Hỗ trợ trực tiếp',
      text: restaurant?.phoneNumber ? `Liên hệ ${restaurant.phoneNumber} khi bạn cần hỗ trợ.` : 'Thông tin liên hệ đang được nhà hàng cập nhật.',
    },
  ]

  return (
    <main className="home-page">
      <section className="home-hero home-premium-hero">
        <div className="home-premium-media" aria-hidden="true">
          <img src={reservationImage} alt="" />
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

          <aside className="home-quick-booking" aria-labelledby="home-quick-booking-title">
            <header>
              <span><CalendarDays aria-hidden="true" /></span>
              <div>
                <h2 id="home-quick-booking-title">Đặt bàn nhanh</h2>
                <p>Chọn thông tin chính, hoàn tất chi tiết ở bước tiếp theo.</p>
              </div>
            </header>

            <div className="home-booking-row">
              <label>Chọn ngày
                <input type="date" min={tomorrow()} value={bookingDate} onChange={event => setBookingDate(event.target.value)} />
              </label>
              <label>Khung giờ
                <select value={bookingTime} onChange={event => setBookingTime(event.target.value)}>
                  <option value="11:30">11:30</option>
                  <option value="12:30">12:30</option>
                  <option value="18:00">18:00</option>
                  <option value="19:00">19:00</option>
                  <option value="20:00">20:00</option>
                </select>
              </label>
            </div>

            <fieldset className="home-guest-picker">
              <legend>Số lượng khách</legend>
              <div>
                {[2, 4, 6, 8].map(value => (
                  <button
                    className={guestCount === value ? 'active' : ''}
                    type="button"
                    key={value}
                    onClick={() => setGuestCount(value)}
                  >
                    {value} khách
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="home-area-field">Khu vực mong muốn
              <select value={areaName} onChange={event => setAreaName(event.target.value)}>
                <option value="">Nhà hàng tự sắp xếp</option>
                {availableAreas.map(area => <option value={area} key={area}>{area}</option>)}
              </select>
            </label>

            <button className="primary-button full home-booking-submit" type="button" onClick={continueReservation}>
              Tiếp tục đặt bàn <ArrowRight aria-hidden="true" />
            </button>
          </aside>
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

      <section className="home-service-strip" aria-label="Dịch vụ nổi bật">
        {serviceHighlights.map(item => (
          <article key={item.title}>
            <span>{item.icon}</span>
            <div><h2>{item.title}</h2><p>{item.text}</p></div>
          </article>
        ))}
      </section>

      <section className="visit-band home-visit-band">
        <div className="visit-invitation home-visit-invitation">
          <div className="home-visit-icon" aria-hidden="true"><CalendarDays /></div>
          <div>
            <h2>Sẵn sàng đón bạn</h2>
            <p>Đặt bàn trước để nhà hàng chủ động chuẩn bị không gian phù hợp cho bạn và người thân.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/reservation')}>Đặt bàn ngay <ArrowRight /></button>
          </div>
        </div>
        <div className="restaurant-facts home-restaurant-facts">
          <h2>Thông tin nhà hàng</h2>
          <div className="facts-grid">
            <p><MapPin /><span><small>Địa chỉ</small><strong>{restaurant?.address || 'Đang cập nhật'}</strong></span></p>
            <p><Clock3 /><span><small>Giờ mở cửa</small><strong>{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Đang cập nhật'}</strong></span></p>
            <p><Phone /><span><small>Điện thoại</small><strong>{restaurant?.phoneNumber || 'Đang cập nhật'}</strong></span></p>
          </div>
        </div>
      </section>
    </main>
  )
}
