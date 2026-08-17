import { CalendarDays, ChevronLeft, QrCode } from 'lucide-react'
import type { CustomerSiteBootstrap } from '../api/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../navigation'

function currency(value: number, code: string) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function MenuItemDetailPage({
  data,
  itemId,
}: {
  data: CustomerSiteBootstrap
  itemId: string
}) {
  const item = data.menuItems.find(menuItem => menuItem.id === itemId)

  if (!item) {
    return (
      <main className="menu-item-detail-page page-section">
        <button className="text-link back-link" type="button" onClick={() => navigate('/menu')}>
          <ChevronLeft /> Quay lại thực đơn
        </button>
        <div className="menu-detail-missing">
          <h1>Không tìm thấy món ăn</h1>
          <p>Món này có thể đã ngừng phục vụ hoặc đường dẫn không còn hợp lệ.</p>
          <button className="primary-button" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</button>
        </div>
      </main>
    )
  }

  return (
    <main className="menu-item-detail-page page-section">
      <button className="text-link back-link" type="button" onClick={() => navigate('/menu')}>
        <ChevronLeft /> Quay lại thực đơn
      </button>

      <section className="menu-detail-card">
        <div className="menu-detail-media">
          <img src={item.imageUrl || heroImage} alt={item.name} />
        </div>

        <div className="menu-detail-content">
          <span className="menu-detail-category">{item.menuCategoryName}</span>
          <h1>{item.name}</h1>
          <p className="menu-detail-description">
            {item.description || 'Món ăn được chế biến tươi mới trong ngày.'}
          </p>

          <div className="menu-detail-meta">
            <strong>{currency(item.price, data.restaurant?.currency || 'VND')}</strong>
            <span className={item.isAvailable ? 'available' : 'unavailable'}>
              {item.isAvailable ? 'Còn món' : 'Hết món'}
            </span>
          </div>

          <div className="menu-detail-qr-note">
            <QrCode aria-hidden="true" />
            <div>
              <strong>Muốn gọi món tại bàn?</strong>
              <p>Hãy quét mã QR đặt trên bàn để chọn số lượng và gửi món trực tiếp xuống bếp.</p>
            </div>
          </div>

          <div className="menu-detail-actions">
            <button className="secondary-button" type="button" onClick={() => navigate('/menu')}>
              Xem món khác
            </button>
            <button className="primary-button" type="button" onClick={() => navigate('/reservation')}>
              Đặt bàn <CalendarDays />
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
