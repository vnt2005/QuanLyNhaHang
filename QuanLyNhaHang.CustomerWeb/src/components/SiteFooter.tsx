import { Clock3, Mail, MapPin, Phone, UtensilsCrossed } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { PublicRestaurant } from '../services/customerSite'
import { navigate } from '../utils/navigation'

export default function SiteFooter({
  restaurant,
}: {
  restaurant: PublicRestaurant | null
  home?: boolean
}) {
  const name = restaurant?.restaurantName?.trim() || 'Nhà Hàng'
  const welcomeMessage = restaurant?.welcomeMessage?.trim() || ''
  const address = restaurant?.address?.trim() || ''
  const phoneNumber = restaurant?.phoneNumber?.trim() || ''
  const email = restaurant?.email?.trim() || ''
  const openingHours =
    restaurant?.openingTime && restaurant?.closingTime
      ? `${restaurant.openingTime} – ${restaurant.closingTime}`
      : ''

  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(path)
  }

  return (
    <footer className="sera-footer">
      <section className="sera-footer-main">
        <div>
          <a className="sera-brand" href="/" onClick={event => follow(event, '/')}>
            <span className="sera-brand-mark">
              {restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : <UtensilsCrossed />}
            </span>
            <span className="sera-brand-copy">
              <strong>{name}</strong>
              {address ? <small>{address}</small> : null}
            </span>
          </a>
          {welcomeMessage ? <p>{welcomeMessage}</p> : null}
        </div>

        <nav className="sera-footer-links" aria-label="Liên kết cuối trang">
          <h3>Khám phá</h3>
          <a href="/menu" onClick={event => follow(event, '/menu')}>
            Thực đơn
          </a>
          <a href="/takeaway" onClick={event => follow(event, '/takeaway')}>
            Mang về
          </a>
          <a href="/reservation" onClick={event => follow(event, '/reservation')}>
            Đặt bàn
          </a>
          <a href="/orders" onClick={event => follow(event, '/orders')}>
            Đơn của tôi
          </a>
        </nav>

        {address || openingHours || phoneNumber || email ? (
          <div className="sera-footer-contact">
            <h3>Liên hệ</h3>
            {address ? (
              <p>
                <MapPin />
                {address}
              </p>
            ) : null}
            {openingHours ? (
              <p>
                <Clock3 />
                {openingHours}
              </p>
            ) : null}
            {phoneNumber ? (
              <p>
                <Phone />
                <a href={`tel:${phoneNumber}`}>{phoneNumber}</a>
              </p>
            ) : null}
            {email ? (
              <p>
                <Mail />
                <a href={`mailto:${email}`}>{email}</a>
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="sera-footer-bottom">
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        {address ? <span>{address}</span> : null}
      </div>
    </footer>
  )
}
