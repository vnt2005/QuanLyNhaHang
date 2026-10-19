import {
  CalendarDays,
  Check,
  ChevronLeft,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import {
  getFallbackDishImage,
  getFallbackImagePosition,
} from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import {
  addTakeawayItem,
  MAX_TAKEAWAY_ITEM_QUANTITY,
} from '../utils/takeawayCart'

const detailFontStyle = { fontFamily: "'Noto Sans Variable', system-ui, sans-serif" }

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
  const itemIndex = data.menuItems.findIndex(menuItem => menuItem.id === itemId)
  const item = itemIndex >= 0 ? data.menuItems[itemIndex] : undefined
  const currencyCode = data.restaurant?.currency || 'VND'

  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')

  if (!item) {
    return (
      <main className="sera-detail" style={detailFontStyle}>
        <Button className="sera-detail-back" variant="ghost" onClick={() => navigate('/menu')}>
          <ChevronLeft /> Quay lại thực đơn
        </Button>
        <div className="sera-empty">
          <div>
            <h2>Không tìm thấy món ăn.</h2>
            <p>Món này có thể đã ngừng phục vụ hoặc đường dẫn không còn hợp lệ.</p>
            <Button onClick={() => navigate('/menu')}>Xem thực đơn</Button>
          </div>
        </div>
      </main>
    )
  }

  const effectiveUnitPrice = item.price
  const totalEstimatedPrice = effectiveUnitPrice * quantity

  function addToTakeaway(goToCart: boolean) {
    const trimmedNote = note.trim()
    const cart = addTakeawayItem(item!.id, quantity, trimmedNote || undefined)
    const quantityInCart = cart[item!.id] || 0
    setMessage(
      `Đã thêm ${quantity} phần ${item!.name} vào giỏ mang về (hiện có ${quantityInCart} phần).`,
    )
    if (goToCart) navigate('/takeaway')
  }

  return (
    <main className="sera-detail" style={detailFontStyle}>
      <div className="sera-detail-nav">
        <Button className="sera-detail-back" variant="ghost" onClick={() => navigate('/menu')}>
          <ChevronLeft /> Quay lại thực đơn
        </Button>
        <div className="sera-detail-breadcrumb">
          <span>Thực đơn</span>
          <span>/</span>
          <span>{item.menuCategoryName}</span>
          <span>/</span>
          <strong>{item.name}</strong>
        </div>
      </div>

      <section className="sera-detail-grid">
        {/* Cột trái: Hình ảnh món ăn */}
        <div className="sera-detail-left-col">
          <div className="sera-detail-media">
            <img
              src={getFallbackDishImage(item, Math.max(0, itemIndex))}
              style={{ objectPosition: getFallbackImagePosition(item, Math.max(0, itemIndex)) }}
              alt={item.name}
            />
          </div>
        </div>

        {/* Cột phải: Thông tin món và đặt món */}
        <div className="sera-detail-copy">
          <div className="flex items-center justify-between gap-4">
            <p className="sera-kicker">{item.menuCategoryName}</p>
            <Badge variant={item.isAvailable ? 'secondary' : 'destructive'}>
              {item.isAvailable ? 'Đang phục vụ' : 'Tạm hết món'}
            </Badge>
          </div>

          <h1>{item.name}</h1>

          {item.description ? <p>{item.description}</p> : null}

          <div className="sera-detail-price-row">
            <div>
              <small className="sera-price-caption">Đơn giá</small>
              <strong className="sera-detail-price">
                {currency(effectiveUnitPrice, currencyCode)}
              </strong>
            </div>
          </div>

          {item.isAvailable ? (
            <div className="sera-detail-order">
              {/* Ghi chú món cho bếp */}
              <div className="sera-modifier-section">
                <label className="sera-field">
                  <span>Ghi chú món ăn cho bếp (Tùy chọn)</span>
                  <Input
                    maxLength={160}
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    placeholder="Ví dụ: Ít cay, không hành, để riêng nước chấm..."
                  />
                </label>
              </div>

              {/* Số lượng */}
              <div className="sera-detail-order-head">
                <div>
                  <p className="sera-kicker">Số lượng mang về</p>
                  <h2>Chọn số phần</h2>
                </div>
                <div className="sera-qty">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(value => Math.max(1, value - 1))}
                  >
                    <Minus />
                  </Button>
                  <strong>{quantity}</strong>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY}
                    onClick={() =>
                      setQuantity(value => Math.min(MAX_TAKEAWAY_ITEM_QUANTITY, value + 1))
                    }
                  >
                    <Plus />
                  </Button>
                </div>
              </div>

              <div className="sera-customization-summary-box">
                <div className="sera-customization-total-line">
                  <span>
                    Tạm tính ({quantity} phần · tối đa {MAX_TAKEAWAY_ITEM_QUANTITY} phần/món)
                  </span>
                  <strong>{currency(totalEstimatedPrice, currencyCode)}</strong>
                </div>
              </div>

              <div className="sera-detail-actions">
                <Button variant="outline" size="lg" onClick={() => addToTakeaway(false)}>
                  <ShoppingBag /> Thêm vào giỏ
                </Button>
                <Button size="lg" onClick={() => addToTakeaway(true)}>
                  Đặt mang về ngay ({currency(totalEstimatedPrice, currencyCode)})
                </Button>
              </div>

              {message ? (
                <p className="sera-detail-note sera-detail-note--highlight">
                  <Check /> {message}{' '}
                  <button
                    className="sera-link"
                    type="button"
                    onClick={() => navigate('/takeaway')}
                  >
                    Mở giỏ mang về
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="sera-detail-secondary">
            <div>
              <QrCode />
              <span>Ăn tại quán? Quét mã QR trên bàn để gọi món trực tiếp.</span>
            </div>
            <Button variant="ghost" onClick={() => navigate('/reservation')}>
              <CalendarDays /> Đặt bàn
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
