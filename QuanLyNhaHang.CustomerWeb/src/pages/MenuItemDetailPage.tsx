import { ArrowRight, CalendarDays, ChevronLeft, Minus, Plus, QrCode, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../utils/navigation'
import { addTakeawayItem, MAX_TAKEAWAY_ITEM_QUANTITY } from '../utils/takeawayCart'

function currency(value: number, code: string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: code || 'VND', maximumFractionDigits: 0 }).format(value)
}

export default function MenuItemDetailPage({ data, itemId }: { data: CustomerSiteBootstrap; itemId: string }) {
  const item = data.menuItems.find(menuItem => menuItem.id === itemId)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  if (!item) {
    return (
      <main className="bistro-detail-missing">
        <Button variant="ghost" onClick={() => navigate('/menu')}><ChevronLeft /> Quay lại</Button>
        <section><h1>Không tìm thấy món ăn.</h1><p>Món này có thể đã ngừng phục vụ hoặc đường dẫn không còn hợp lệ.</p><Button onClick={() => navigate('/menu')}>Xem thực đơn</Button></section>
      </main>
    )
  }

  function addToTakeaway(goToCart: boolean) {
    const cart = addTakeawayItem(item!.id, quantity)
    const quantityInCart = cart[item!.id] || 0
    setMessage(`Giỏ mang về hiện có ${quantityInCart} phần ${item!.name}.`)
    if (goToCart) navigate('/takeaway')
  }

  return (
    <main className="bistro-dish-detail">
      <Button variant="ghost" className="detail-back" onClick={() => navigate('/menu')}><ChevronLeft /> Thực đơn</Button>

      <section className="dish-detail-stage">
        <div className="dish-detail-visual">
          <div className="dish-detail-orbit" aria-hidden="true" />
          <div className="dish-detail-plate"><img src={item.imageUrl || heroImage} alt={item.name} /></div>
          <div className="dish-price-token"><small>Giá món</small><strong>{currency(item.price, data.restaurant?.currency || 'VND')}</strong></div>
        </div>

        <div className="dish-detail-copy">
          <div className="dish-detail-meta"><span>{item.menuCategoryName}</span><Badge variant={item.isAvailable ? 'secondary' : 'destructive'}>{item.isAvailable ? 'Còn món' : 'Tạm hết'}</Badge></div>
          <h1>{item.name}</h1>
          <p>{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>

          {item.isAvailable ? (
            <div className="dish-order-box">
              <div><span>MANG VỀ</span><h2>Chọn số lượng</h2><p>Tối đa {MAX_TAKEAWAY_ITEM_QUANTITY} phần cho món này.</p></div>
              <div className="dish-order-controls">
                <div className="dish-qty">
                  <Button variant="outline" size="icon" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus /></Button>
                  <strong>{quantity}</strong>
                  <Button variant="outline" size="icon" disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY} onClick={() => setQuantity(value => Math.min(MAX_TAKEAWAY_ITEM_QUANTITY, value + 1))}><Plus /></Button>
                </div>
                <strong>{currency(item.price * quantity, data.restaurant?.currency || 'VND')}</strong>
              </div>
              <div className="dish-order-actions">
                <Button variant="outline" onClick={() => addToTakeaway(false)}><ShoppingBag /> Thêm vào giỏ</Button>
                <Button onClick={() => addToTakeaway(true)}>Đặt mang về <ArrowRight /></Button>
              </div>
              {message ? <p className="dish-added-message">{message} <button type="button" onClick={() => navigate('/takeaway')}>Xem giỏ →</button></p> : null}
            </div>
          ) : null}

          <div className="dish-detail-secondary">
            <div><QrCode /><span><strong>Ăn tại quán?</strong><small>Quét QR trên bàn để gọi món đúng bàn.</small></span></div>
            <Button variant="ghost" onClick={() => navigate('/reservation')}><CalendarDays /> Đặt bàn</Button>
          </div>
        </div>
      </section>
    </main>
  )
}
