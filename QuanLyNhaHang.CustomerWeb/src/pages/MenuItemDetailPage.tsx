import { CalendarDays, ChevronLeft, Minus, Plus, QrCode, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import type { CustomerSiteBootstrap } from '../api/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../navigation'
import { addTakeawayItem } from '../takeawayCart'

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
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  if (!item) {
    return (
      <main className="menu-item-detail-page page-section">
        <button className="text-link back-link" type="button" onClick={() => navigate('/menu')}><ChevronLeft /> Quay lại thực đơn</button>
        <div className="menu-detail-missing"><h1>Không tìm thấy món ăn</h1><p>Món này có thể đã ngừng phục vụ hoặc đường dẫn không còn hợp lệ.</p><button className="primary-button" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</button></div>
      </main>
    )
  }

  function addToTakeaway(goToCart: boolean) {
    addTakeawayItem(item!.id, quantity)
    setMessage(`Đã thêm ${quantity} phần ${item!.name} vào giỏ mang về.`)
    if (goToCart) navigate('/takeaway')
  }

  return (
    <main className="menu-item-detail-page page-section">
      <button className="text-link back-link" type="button" onClick={() => navigate('/menu')}><ChevronLeft /> Quay lại thực đơn</button>

      <section className="menu-detail-card">
        <div className="menu-detail-media"><img src={item.imageUrl || heroImage} alt={item.name} /></div>
        <div className="menu-detail-content">
          <span className="menu-detail-category">{item.menuCategoryName}</span>
          <h1>{item.name}</h1>
          <p className="menu-detail-description">{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>

          <div className="menu-detail-meta"><strong>{currency(item.price, data.restaurant?.currency || 'VND')}</strong><span className={item.isAvailable ? 'available' : 'unavailable'}>{item.isAvailable ? 'Còn món' : 'Hết món'}</span></div>

          {item.isAvailable ? (
            <div className="menu-detail-takeaway">
              <div><strong>Đặt món mang về</strong><p>Không cần chọn bàn. Chọn số lượng rồi thêm vào giỏ mang về.</p></div>
              <div className="menu-detail-order-row">
                <div className="menu-detail-quantity"><button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus /></button><span>{quantity}</span><button type="button" aria-label="Tăng số lượng" disabled={quantity >= 99} onClick={() => setQuantity(value => Math.min(99, value + 1))}><Plus /></button></div>
                <button className="secondary-button" type="button" onClick={() => addToTakeaway(false)}><ShoppingBag /> Thêm vào giỏ</button>
                <button className="primary-button" type="button" onClick={() => addToTakeaway(true)}>Đặt mang về ngay</button>
              </div>
              {message ? <p className="menu-detail-added" role="status">{message} <button type="button" className="text-link" onClick={() => navigate('/takeaway')}>Xem giỏ</button></p> : null}
            </div>
          ) : null}

          <div className="menu-detail-qr-note"><QrCode aria-hidden="true" /><div><strong>Ăn tại quán?</strong><p>Quét mã QR đặt trên bàn để gọi món đúng bàn. Đơn mang về không cần QR.</p></div></div>

          <div className="menu-detail-actions"><button className="secondary-button" type="button" onClick={() => navigate('/menu')}>Xem món khác</button><button className="secondary-button" type="button" onClick={() => navigate('/reservation')}>Đặt bàn <CalendarDays /></button></div>
        </div>
      </section>
    </main>
  )
}
