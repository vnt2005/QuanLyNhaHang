import { Clock3, Mail, MapPin, Phone } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { PublicRestaurant } from '../api/customerSite'
import { navigate } from '../navigation'

export default function SiteFooter({ restaurant }: { restaurant: PublicRestaurant | null }) {
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
