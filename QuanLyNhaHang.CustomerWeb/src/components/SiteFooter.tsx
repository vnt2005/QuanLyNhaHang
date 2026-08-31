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
    <footer className="bistro-v2-footer">
      <div className="bistro-v2-footer-cta">
        <div>
          <span>Hẹn một bữa ăn gần nhất</span>
          <h2>Bàn đẹp, món ngon — đặt trước trong vài chạm.</h2>
        </div>
        <div>
          <Button size="lg" onClick={() => navigate('/reservation')}>Đặt bàn</Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/menu')}>Xem thực đơn</Button>
        </div>
      </div>

      <div className="bistro-v2-footer-main">
        <div className="bistro-v2-footer-brand">
          <a href="/" onClick={event => follow(event, '/')}>
            <span>{restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : <UtensilsCrossed />}</span>
            <div><strong>{name}</strong><small>Vietnamese Bistro</small></div>
          </a>
          <p>{restaurant?.welcomeMessage || 'Món Việt mỗi ngày, phục vụ theo cách thuận tiện hơn cho bạn.'}</p>
        </div>

        <div className="bistro-v2-footer-links">
          <h3>Khám phá</h3>
          <a href="/menu" onClick={event => follow(event, '/menu')}>Thực đơn</a>
          <a href="/takeaway" onClick={event => follow(event, '/takeaway')}>Mang về</a>
          <a href="/reservation" onClick={event => follow(event, '/reservation')}>Đặt bàn</a>
          <a href="/orders" onClick={event => follow(event, '/orders')}>Đơn của tôi</a>
        </div>

        <div className="bistro-v2-footer-contact">
          <h3>Liên hệ</h3>
          <p><MapPin />{restaurant?.address || 'Nha Trang'}</p>
          <p><Clock3 />{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Đang cập nhật'}</p>
          <p><Phone />{restaurant?.phoneNumber ? <a href={`tel:${restaurant.phoneNumber}`}>{restaurant.phoneNumber}</a> : 'Đang cập nhật'}</p>
          {restaurant?.email ? <p><Mail /><a href={`mailto:${restaurant.email}`}>{restaurant.email}</a></p> : null}
        </div>
      </div>

      <div className="bistro-v2-footer-bottom">
        <span>© {new Date().getFullYear()} {name}</span>
        <span>Ẩm thực Việt · Nha Trang</span>
      </div>
    </footer>
  )
}
