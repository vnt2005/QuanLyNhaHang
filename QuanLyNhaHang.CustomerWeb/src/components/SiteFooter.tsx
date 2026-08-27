import { CalendarDays, Clock3, Mail, MapPin, Phone, UtensilsCrossed } from 'lucide-react'
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
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <div className="home-footer-logo">
              <span>{restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : <UtensilsCrossed aria-hidden="true" />}</span>
              <div><strong>{name}</strong><small>Ẩm thực Việt</small></div>
            </div>
            <p>{restaurant?.welcomeMessage || 'Trọn vị Việt trong từng khoảnh khắc. Cảm ơn bạn đã ghé thăm và đồng hành cùng nhà hàng.'}</p>
          </div>

          <div className="home-footer-links">
            <h2>Dịch vụ khách hàng</h2>
            <a href="/menu" onClick={event => follow(event, '/menu')}>Xem thực đơn</a>
            <a href="/reservation" onClick={event => follow(event, '/reservation')}>Đặt bàn trực tuyến</a>
            <a href="/takeaway" onClick={event => follow(event, '/takeaway')}>Đặt món mang về</a>
            <a href="/orders" onClick={event => follow(event, '/orders')}>Tra cứu đơn hàng</a>
          </div>

          <div className="home-footer-contact">
            <h2>Thông tin liên hệ</h2>
            <p><Phone aria-hidden="true" />{restaurant?.phoneNumber || 'Số điện thoại đang cập nhật'}</p>
            {restaurant?.email ? <p><Mail aria-hidden="true" />{restaurant.email}</p> : null}
            <p><Clock3 aria-hidden="true" />{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Giờ mở cửa đang cập nhật'}</p>
            <p><MapPin aria-hidden="true" />{restaurant?.address || 'Địa chỉ đang được cập nhật'}</p>
          </div>

          <div className="home-footer-cta">
            <h2>Sẵn sàng cho bữa ăn tiếp theo?</h2>
            <p>Đặt bàn trước hoặc xem thực đơn để chuẩn bị lựa chọn phù hợp cho bạn.</p>
            <button className="primary-button" type="button" onClick={() => navigate('/reservation')}><CalendarDays aria-hidden="true" /> Đặt bàn ngay</button>
            <a href="/menu" onClick={event => follow(event, '/menu')}>Khám phá thực đơn</a>
          </div>
        </div>
        <div className="footer-legal">© {new Date().getFullYear()} {name}. Mọi quyền được bảo lưu.</div>
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
