import { useEffect, useMemo, useState } from 'react'
import {
  createQrOrder,
  getQrOrderContext,
  type QrOrderMenuItem,
  type QrOrderResult,
  type QrOrderTable,
} from '../api/qrOrders'

type QrOrderPageProps = {
  token: string
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function getTableStatusLabel(value: string) {
  const labels: Record<string, string> = {
    Available: 'Sẵn sàng phục vụ',
    Occupied: 'Đang có khách',
    Reserved: 'Đã đặt trước',
    Maintenance: 'Đang bảo trì',
  }
  return labels[value] ?? value
}

function getCategoryName(item: QrOrderMenuItem) {
  return item.menuCategoryName?.trim() || 'Món khác'
}

export default function QrOrderPage({ token }: QrOrderPageProps) {
  const [table, setTable] = useState<QrOrderTable | null>(null)
  const [menuItems, setMenuItems] = useState<QrOrderMenuItem[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('Tất cả')
  const [orderNote, setOrderNote] = useState('')
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    message: string
    order: QrOrderResult
  } | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    void getQrOrderContext(token)
      .then(result => {
        if (!active) return
        setTable(result.table)
        setMenuItems(result.menuItems)
      })
      .catch(exception => {
        if (!active) return
        setError(
          exception instanceof Error
            ? exception.message
            : 'Không mở được thực đơn của bàn này.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const categories = useMemo(
    () => [
      'Tất cả',
      ...Array.from(new Set(menuItems.map(getCategoryName))),
    ],
    [menuItems],
  )

  const filteredItems = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase('vi')
    return menuItems.filter(item => {
      const matchesCategory =
        category === 'Tất cả' || getCategoryName(item) === category
      const matchesKeyword =
        !normalizedKeyword ||
        item.name.toLocaleLowerCase('vi').includes(normalizedKeyword) ||
        item.description?.toLocaleLowerCase('vi').includes(normalizedKeyword)
      return matchesCategory && matchesKeyword
    })
  }, [category, keyword, menuItems])

  const selectedItems = useMemo(
    () => menuItems
      .map(item => ({ item, quantity: quantities[item.id] ?? 0 }))
      .filter(entry => entry.quantity > 0),
    [menuItems, quantities],
  )

  const selectedQuantity = selectedItems.reduce(
    (total, entry) => total + entry.quantity,
    0,
  )
  const totalAmount = selectedItems.reduce(
    (total, entry) => total + entry.item.price * entry.quantity,
    0,
  )

  function changeQuantity(itemId: string, delta: number) {
    setQuantities(current => {
      const nextQuantity = Math.min(
        99,
        Math.max(0, (current[itemId] ?? 0) + delta),
      )
      if (nextQuantity === 0) {
        const next = { ...current }
        delete next[itemId]
        return next
      }
      return { ...current, [itemId]: nextQuantity }
    })
  }

  async function submitOrder() {
    if (selectedItems.length === 0 || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await createQrOrder(token, {
        note: orderNote,
        items: selectedItems.map(entry => ({
          menuItemId: entry.item.id,
          quantity: entry.quantity,
        })),
      })
      setSuccess({ message: result.message, order: result.data })
      setCartOpen(false)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không gửi được món xuống bếp.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function startAnotherOrder() {
    setQuantities({})
    setOrderNote('')
    setSuccess(null)
    setKeyword('')
    setCategory('Tất cả')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <main className="qr-order-page qr-order-state-page">
        <div className="qr-order-state-card" role="status">
          <span className="qr-order-spinner" />
          <h1>Đang mở thực đơn…</h1>
          <p>Hệ thống đang kiểm tra mã QR và tải các món đang phục vụ.</p>
        </div>
      </main>
    )
  }

  if (!table || error && menuItems.length === 0) {
    return (
      <main className="qr-order-page qr-order-state-page">
        <div className="qr-order-state-card error" role="alert">
          <span className="qr-order-state-icon">!</span>
          <h1>Không thể mở thực đơn</h1>
          <p>{error || 'Mã QR không hợp lệ hoặc đã ngừng hoạt động.'}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Thử lại
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="qr-order-page">
      <header className="qr-order-hero">
        <div className="qr-order-brand">
          <span>QL</span>
          <div>
            <strong>Nhà Hàng</strong>
            <small>Gọi món tại bàn</small>
          </div>
        </div>
        <div className="qr-order-table-badge">
          <span>BÀN CỦA BẠN</span>
          <strong>{table.restaurantTableName}</strong>
          <small>{getTableStatusLabel(table.tableStatus)}</small>
        </div>
        <div className="qr-order-hero-copy">
          <span>THỰC ĐƠN ĐANG PHỤC VỤ</span>
          <h1>Chọn món, kiểm tra giỏ và xác nhận</h1>
          <p>
            Không cần đăng nhập. Món bạn xác nhận sẽ được tạo thành đơn của
            đúng {table.restaurantTableName} và gửi trực tiếp xuống bếp.
          </p>
        </div>
      </header>

      <section className="qr-order-content">
        {error && (
          <div className="qr-order-alert" role="alert">
            <span>!</span>
            <p>{error}</p>
            <button type="button" onClick={() => setError('')} aria-label="Đóng">
              ×
            </button>
          </div>
        )}

        <div className="qr-order-search-row">
          <label className="qr-order-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm món ăn…"
            />
          </label>
          <span>{menuItems.length} món đang mở bán</span>
        </div>

        <nav className="qr-order-categories" aria-label="Danh mục món ăn">
          {categories.map(item => (
            <button
              type="button"
              key={item}
              className={category === item ? 'active' : ''}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {filteredItems.length === 0 ? (
          <div className="qr-order-empty">
            <span>⌕</span>
            <h2>Không tìm thấy món phù hợp</h2>
            <p>Thử đổi từ khóa hoặc chọn danh mục khác.</p>
          </div>
        ) : (
          <section className="qr-order-menu-grid" aria-label="Danh sách món ăn">
            {filteredItems.map(item => {
              const quantity = quantities[item.id] ?? 0
              return (
                <article className="qr-order-menu-card" key={item.id}>
                  <div className="qr-order-menu-image">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} loading="lazy" />
                    ) : (
                      <span>{item.name.charAt(0).toLocaleUpperCase('vi')}</span>
                    )}
                  </div>
                  <div className="qr-order-menu-copy">
                    <small>{getCategoryName(item)}</small>
                    <h2>{item.name}</h2>
                    <p>{item.description?.trim() || 'Món đang phục vụ tại nhà hàng.'}</p>
                    <strong>{formatMoney(item.price)}</strong>
                  </div>
                  {quantity === 0 ? (
                    <button
                      type="button"
                      className="qr-order-add-button"
                      onClick={() => changeQuantity(item.id, 1)}
                      aria-label={`Thêm ${item.name}`}
                    >
                      <span>＋</span> Thêm
                    </button>
                  ) : (
                    <div className="qr-order-quantity" aria-label={`Số lượng ${item.name}`}>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, -1)}
                        aria-label={`Giảm ${item.name}`}
                      >
                        −
                      </button>
                      <strong>{quantity}</strong>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.id, 1)}
                        aria-label={`Tăng ${item.name}`}
                      >
                        ＋
                      </button>
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </section>

      {selectedQuantity > 0 && (
        <button
          type="button"
          className="qr-order-cart-bar"
          onClick={() => setCartOpen(true)}
        >
          <span className="qr-order-cart-count">{selectedQuantity}</span>
          <span>
            <small>Giỏ món của {table.restaurantTableName}</small>
            <strong>Xem giỏ món</strong>
          </span>
          <strong>{formatMoney(totalAmount)}</strong>
        </button>
      )}

      {cartOpen && (
        <div
          className="qr-order-drawer-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !submitting) setCartOpen(false)
          }}
        >
          <section className="qr-order-drawer" role="dialog" aria-modal="true">
            <header>
              <div>
                <span>XÁC NHẬN GỌI MÓN</span>
                <h2>Giỏ món · {table.restaurantTableName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                disabled={submitting}
                aria-label="Đóng giỏ món"
              >
                ×
              </button>
            </header>

            <div className="qr-order-cart-items">
              {selectedItems.map(entry => (
                <article key={entry.item.id}>
                  <div>
                    <strong>{entry.item.name}</strong>
                    <small>{formatMoney(entry.item.price)} / món</small>
                  </div>
                  <div className="qr-order-quantity compact">
                    <button
                      type="button"
                      onClick={() => changeQuantity(entry.item.id, -1)}
                      aria-label={`Giảm ${entry.item.name} trong giỏ`}
                    >
                      −
                    </button>
                    <strong>{entry.quantity}</strong>
                    <button
                      type="button"
                      onClick={() => changeQuantity(entry.item.id, 1)}
                      aria-label={`Tăng ${entry.item.name} trong giỏ`}
                    >
                      ＋
                    </button>
                  </div>
                  <strong>{formatMoney(entry.item.price * entry.quantity)}</strong>
                </article>
              ))}
            </div>

            <label className="qr-order-note">
              Ghi chú chung cho bếp
              <textarea
                value={orderNote}
                onChange={event => setOrderNote(event.target.value)}
                placeholder="Ví dụ: ít cay, không hành…"
                maxLength={500}
              />
            </label>

            <div className="qr-order-cart-total">
              <span>
                <small>{selectedQuantity} món</small>
                <strong>Tổng tiền tạm tính</strong>
              </span>
              <strong>{formatMoney(totalAmount)}</strong>
            </div>

            <button
              type="button"
              className="qr-order-confirm-button"
              onClick={() => void submitOrder()}
              disabled={submitting || selectedItems.length === 0}
            >
              {submitting ? 'Đang gửi xuống bếp…' : 'Xác nhận gọi món'}
            </button>
            <p className="qr-order-confirm-hint">
              Sau khi xác nhận, đơn sẽ xuất hiện trong màn hình Đơn hàng và Bếp.
            </p>
          </section>
        </div>
      )}

      {success && (
        <div className="qr-order-success-backdrop">
          <section className="qr-order-success-card" role="status">
            <span className="qr-order-success-icon">✓</span>
            <small>GỌI MÓN THÀNH CÔNG</small>
            <h2>Đã gửi món xuống bếp</h2>
            <p>{success.message}</p>
            <div>
              <span>
                Mã đơn <strong>{success.order.orderCode}</strong>
              </span>
              <span>
                Bàn <strong>{success.order.restaurantTableName}</strong>
              </span>
              <span>
                Tổng tiền <strong>{formatMoney(success.order.totalAmount)}</strong>
              </span>
            </div>
            <button type="button" onClick={startAnotherOrder}>
              Gọi thêm món
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
