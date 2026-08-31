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
      <main className="sera-detail">
        <Button className="sera-detail-back" variant="ghost" onClick={() => navigate('/menu')}><ChevronLeft /> Quay lại thực đơn</Button>
        <div className="sera-empty"><div><h2>Không tìm thấy món ăn.</h2><p>Món này có thể đã ngừng phục vụ hoặc đường dẫn không còn hợp lệ.</p><Button onClick={() => navigate('/menu')}>Xem thực đơn</Button></div></div>
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
    <main className="sera-detail">
      <Button className="sera-detail-back" variant="ghost" onClick={() => navigate('/menu')}><ChevronLeft /> Thực đơn</Button>

      <section className="sera-detail-grid">
        <div className="sera-detail-media"><img src={item.imageUrl || heroImage} alt={item.name} /></div>
        <div className="sera-detail-copy">
          <div className="flex items-center justify-between gap-4">
            <p className="sera-kicker">{item.menuCategoryName}</p>
            <Badge variant={item.isAvailable ? 'secondary' : 'destructive'}>{item.isAvailable ? 'Còn món' : 'Tạm hết'}</Badge>
          </div>
          <h1>{item.name}</h1>
          <p>{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>
          <strong className="sera-detail-price">{currency(item.price, data.restaurant?.currency || 'VND')}</strong>

          {item.isAvailable ? (
            <div className="sera-detail-order">
              <div className="sera-detail-order-head">
                <div><p className="sera-kicker">Mang về</p><h2>Chọn số lượng</h2></div>
                <div className="sera-qty">
                  <Button variant="outline" size="icon" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus /></Button>
                  <strong>{quantity}</strong>
                  <Button variant="outline" size="icon" disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY} onClick={() => setQuantity(value => Math.min(MAX_TAKEAWAY_ITEM_QUANTITY, value + 1))}><Plus /></Button>
                </div>
              </div>
              <p className="sera-detail-note">Tối đa {MAX_TAKEAWAY_ITEM_QUANTITY} phần cho món này · Thành tiền {currency(item.price * quantity, data.restaurant?.currency || 'VND')}</p>
              <div className="sera-detail-actions">
                <Button variant="outline" onClick={() => addToTakeaway(false)}><ShoppingBag /> Thêm vào giỏ</Button>
                <Button onClick={() => addToTakeaway(true)}>Đặt mang về <ArrowRight /></Button>
              </div>
              {message ? <p className="sera-detail-note">{message} <button className="sera-link" type="button" onClick={() => navigate('/takeaway')}>Xem giỏ</button></p> : null}
            </div>
          ) : null}

          <div className="sera-detail-secondary">
            <div><QrCode /><span>Ăn tại quán? Quét QR trên bàn để gọi món đúng bàn.</span></div>
            <Button variant="ghost" onClick={() => navigate('/reservation')}><CalendarDays /> Đặt bàn</Button>
          </div>
        </div>
      </section>
    </main>
  )
}
