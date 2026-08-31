import { ArrowRight, CalendarDays, Clock3, Mail, MapPin, Phone, UtensilsCrossed } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { PublicRestaurant } from '../services/customerSite'
import { navigate } from '../utils/navigation'

export default function SiteFooter({ restaurant, home = false }: { restaurant: PublicRestaurant | null; home?: boolean }) {
  const name = restaurant?.restaurantName || 'Nhà Hàng'
  const links = [
    ['Trang chủ', '/'],
    ['Thực đơn', '/menu'],
    ['Đặt bàn', '/reservation'],
    ['Đơn của tôi', '/orders'],
  ] as const

  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(path)
  }

  if (home) {
    return (
      <footer className="site-footer home-site-footer">
        <div className="home-footer-shell">
          <div className="home-footer-top">
            <div className="home-footer-brand">
              <div className="home-footer-logo">
                <span>{restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : <UtensilsCrossed aria-hidden="true" />}</span>
                <div>
                  <strong>{name}</strong>
                  <small>Ẩm thực Việt</small>
                </div>
              </div>
              <p>{restaurant?.welcomeMessage || 'Trọn vị Việt trong từng khoảnh khắc. Cảm ơn bạn đã ghé thăm và đồng hành cùng nhà hàng.'}</p>
            </div>

            <div className="home-footer-action-block">
              <div>
                <span>Hẹn bạn tại VNT</span>
                <h2>Chọn món ngon hoặc đặt bàn cho bữa ăn tiếp theo.</h2>
              </div>
              <div className="home-footer-actions">
                <a className="home-footer-action secondary" href="/menu" onClick={event => follow(event, '/menu')}>
                  Xem thực đơn <ArrowRight aria-hidden="true" />
                </a>
                <button className="home-footer-action primary" type="button" onClick={() => navigate('/reservation')}>
                  <CalendarDays aria-hidden="true" /> Đặt bàn
                </button>
              </div>
            </div>
          </div>

          <div className="home-footer-main">
            <nav className="home-footer-links" aria-labelledby="home-footer-services-title">
              <h2 id="home-footer-services-title">Dịch vụ</h2>
              <a href="/menu" onClick={event => follow(event, '/menu')}>Xem thực đơn</a>
              <a href="/reservation" onClick={event => follow(event, '/reservation')}>Đặt bàn trực tuyến</a>
              <a href="/takeaway" onClick={event => follow(event, '/takeaway')}>Đặt món mang về</a>
              <a href="/orders" onClick={event => follow(event, '/orders')}>Tra cứu đơn hàng</a>
            </nav>

            <section className="home-footer-contact" aria-labelledby="home-footer-contact-title">
              <h2 id="home-footer-contact-title">Liên hệ</h2>
              {restaurant?.phoneNumber ? (
                <a className="home-footer-contact-line" href={`tel:${restaurant.phoneNumber}`}>
                  <Phone aria-hidden="true" />
                  <span><small>Điện thoại</small><strong>{restaurant.phoneNumber}</strong></span>
                </a>
              ) : (
                <p className="home-footer-contact-line"><Phone aria-hidden="true" /><span><small>Điện thoại</small><strong>Đang cập nhật</strong></span></p>
              )}
              {restaurant?.email ? (
                <a className="home-footer-contact-line" href={`mailto:${restaurant.email}`}>
                  <Mail aria-hidden="true" />
                  <span><small>Email</small><strong>{restaurant.email}</strong></span>
                </a>
              ) : null}
            </section>

            <section className="home-footer-visit" aria-labelledby="home-footer-visit-title">
              <h2 id="home-footer-visit-title">Ghé nhà hàng</h2>
              <p><MapPin aria-hidden="true" /><span><small>Địa chỉ</small><strong>{restaurant?.address || 'Địa chỉ đang được cập nhật'}</strong></span></p>
              <p><Clock3 aria-hidden="true" /><span><small>Giờ mở cửa</small><strong>{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Đang cập nhật'}</strong></span></p>
            </section>
          </div>

          <div className="home-footer-bottom">
            <span>© {new Date().getFullYear()} {name}. Mọi quyền được bảo lưu.</span>
            <span>Ẩm thực Việt · Phục vụ mỗi ngày</span>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <strong>{name}</strong>
          <p>Trọn vị Việt trong từng khoảnh khắc. Cảm ơn bạn đã ghé thăm.</p>
        </div>
        <div>
          <h2>Khám phá</h2>
          {links.map(([label, path]) => (
            <a href={path} key={path} onClick={event => follow(event, path)}>{label}</a>
          ))}
        </div>
        <div>
          <h2>Thông tin nhà hàng</h2>
          <p><MapPin aria-hidden="true" />{restaurant?.address || 'Địa chỉ đang được cập nhật'}</p>
          <p><Clock3 aria-hidden="true" />{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Giờ mở cửa đang cập nhật'}</p>
        </div>
        <div>
          <h2>Liên hệ</h2>
          <p><Phone aria-hidden="true" />{restaurant?.phoneNumber || 'Số điện thoại đang cập nhật'}</p>
          {restaurant?.email ? <p><Mail aria-hidden="true" />{restaurant.email}</p> : null}
        </div>
      </div>
      <div className="footer-legal">© {new Date().getFullYear()} {name}. Mọi quyền được bảo lưu.</div>
    </footer>
  )
}
