import {
  Car,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  Navigation,
  Phone,
  UtensilsCrossed,
} from 'lucide-react'
import type { MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { PublicRestaurant } from '../services/customerSite'
import { navigate } from '../utils/navigation'

export default function SiteFooter({
  restaurant,
}: {
  restaurant: PublicRestaurant | null
  home?: boolean
}) {
  const name = restaurant?.restaurantName || 'Nhà Hàng'
  const fullAddress =
    restaurant?.address || 'Khu đô thị biển Lộc Thọ, Nha Trang, Khánh Hòa'

  const googleMapsDirectionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=12.2388,109.1967'
  const googleMapsEmbedUrl =
    'https://maps.google.com/maps?q=12.2388,109.1967&hl=vi&z=15&output=embed'

  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(path)
  }

  return (
    <footer className="sera-footer">
      {/* KHỐI BẢN ĐỒ GOOGLE MAPS NHÚNG TRỰC TIẾP & CHỈ ĐƯỜNG ĐẾN NHÀ HÀNG */}
      <section
        className="sera-footer-map-section"
        aria-labelledby="footer-map-heading"
      >
        <div className="sera-footer-map-card">
          <div className="sera-footer-map-info">
            <div>
              <p className="sera-kicker">Vị trí nhà hàng & Chỉ đường trực tiếp</p>
              <h2 id="footer-map-heading" className="sera-footer-map-title">
                Ghé thăm không gian {name} tại trung tâm biển Nha Trang.
              </h2>
            </div>

            <div className="sera-footer-location-details">
              <div className="sera-footer-loc-item">
                <MapPin className="sera-footer-loc-icon" aria-hidden="true" />
                <div>
                  <strong>Địa chỉ đón khách & nhận món mang về</strong>
                  <span>{fullAddress}</span>
                </div>
              </div>

              <div className="sera-footer-loc-item">
                <Clock3 className="sera-footer-loc-icon" aria-hidden="true" />
                <div>
                  <strong>Khung giờ mở cửa phục vụ mỗi ngày</strong>
                  <span>
                    {restaurant
                      ? `${restaurant.openingTime} – ${restaurant.closingTime}`
                      : '07:00 – 23:00'}
                  </span>
                </div>
              </div>

              <div className="sera-footer-loc-item">
                <Car className="sera-footer-loc-icon" aria-hidden="true" />
                <div>
                  <strong>Tiện ích đỗ xe & Đón tiếp đoàn</strong>
                  <span>
                    Có bãi đỗ xe ô tô miễn phí trước sảnh, thang máy lên các tầng và lối đi thuận tiện.
                  </span>
                </div>
              </div>
            </div>

            <div className="sera-footer-map-actions">
              <Button asChild size="lg">
                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation aria-hidden="true" /> Mở Google Maps chỉ đường
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                type="button"
                onClick={() => navigate('/reservation')}
              >
                Đặt bàn giữ chỗ trước
              </Button>
            </div>
          </div>

          <div className="sera-footer-map-embed-wrap">
            <iframe
              title={`Bản đồ vị trí nhà hàng ${name} tại Nha Trang`}
              src={googleMapsEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="sera-footer-map-iframe"
              allowFullScreen
            />
            <div className="sera-footer-map-overlay-bar">
              <span>📍 Tọa độ: 12.2388° N, 109.1967° E · Lộc Thọ, Nha Trang</span>
              <a
                href={googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sera-link"
              >
                Phóng to bản đồ <ExternalLink className="inline size-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CỘT THÔNG TIN CHÍNH */}
      <section className="sera-footer-main">
        <div>
          <a className="sera-brand" href="/" onClick={event => follow(event, '/')}>
            <span className="sera-brand-mark">
              {restaurant?.logoUrl ? (
                <img src={restaurant.logoUrl} alt="" />
              ) : (
                <UtensilsCrossed />
              )}
            </span>
            <span className="sera-brand-copy">
              <strong>{name}</strong>
              <small>Vietnamese dining · Nha Trang</small>
            </span>
          </a>
          <p>
            {restaurant?.welcomeMessage ||
              'Món Việt mỗi ngày, phục vụ gọn gàng và thuận tiện hơn cho bạn.'}
          </p>
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

        <div className="sera-footer-contact">
          <h3>Liên hệ</h3>
          <p>
            <MapPin />
            {restaurant?.address || 'Nha Trang'}
          </p>
          <p>
            <Clock3 />
            {restaurant
              ? `${restaurant.openingTime} – ${restaurant.closingTime}`
              : 'Đang cập nhật'}
          </p>
          <p>
            <Phone />
            {restaurant?.phoneNumber ? (
              <a href={`tel:${restaurant.phoneNumber}`}>
                {restaurant.phoneNumber}
              </a>
            ) : (
              'Đang cập nhật'
            )}
          </p>
          {restaurant?.email ? (
            <p>
              <Mail />
              <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a>
            </p>
          ) : null}
        </div>
      </section>

      <div className="sera-footer-bottom">
        <span>
          © {new Date().getFullYear()} {name}
        </span>
        <span>Ẩm thực Việt · Nha Trang</span>
      </div>
    </footer>
  )
}
