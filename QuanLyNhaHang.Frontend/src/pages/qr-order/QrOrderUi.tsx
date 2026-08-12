import type { ReactNode } from 'react'
import type {
  QrOrderMenuItem,
  QrOrderResult,
  QrOrderTable,
} from '../../api/qrOrders'

export type CustomerView = 'menu' | 'order' | 'account'

export type CartEntry = {
  item: QrOrderMenuItem
  quantity: number
  note: string
}

type IconProps = {
  children: ReactNode
  className?: string
  viewBox?: string
}

function Icon({ children, className, viewBox = '0 0 24 24' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function SearchIcon() {
  return <Icon><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>
}

function TableIcon() {
  return <Icon><path d="M4 8h16M7 8v10M17 8v10M5 5h14" /></Icon>
}

function MenuIcon() {
  return <Icon><path d="M5 19a7 7 0 0 1 14 0M4 19h16M12 6v2M9 7h6" /></Icon>
}

function ReceiptIcon() {
  return <Icon><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></Icon>
}

function AccountIcon() {
  return <Icon><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></Icon>
}

function CartIcon() {
  return <Icon><path d="M3 4h2l2 11h10l2-7H6" /><circle cx="9" cy="19" r="1" /><circle cx="17" cy="19" r="1" /></Icon>
}

function RefreshIcon() {
  return <Icon><path d="M20 6v5h-5M4 18v-5h5" /><path d="M6.1 9A7 7 0 0 1 18 6l2 5M18 15a7 7 0 0 1-12 3l-2-5" /></Icon>
}

function CloseIcon() {
  return <Icon><path d="m6 6 12 12M18 6 6 18" /></Icon>
}

function ChevronIcon() {
  return <Icon><path d="m9 18 6-6-6-6" /></Icon>
}

function CheckIcon() {
  return <Icon><path d="m5 12 4 4L19 6" /></Icon>
}

function ClockIcon() {
  return <Icon><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></Icon>
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export function getCategoryName(item: QrOrderMenuItem) {
  return item.menuCategoryName?.trim() || 'Món khác'
}

export function CustomerHeader({ table }: { table: QrOrderTable }) {
  return (
    <header className="customer-header">
      <div className="customer-brand" aria-label="Nhà Hàng">
        <span>NH</span>
        <strong>Nhà Hàng</strong>
      </div>
      <div className="customer-table">
        <TableIcon />
        <span>{table.restaurantTableName}</span>
      </div>
    </header>
  )
}

export function QuantityControl({
  label,
  quantity,
  compact = false,
  onDecrease,
  onIncrease,
}: {
  label: string
  quantity: number
  compact?: boolean
  onDecrease: () => void
  onIncrease: () => void
}) {
  return (
    <div className={`customer-quantity${compact ? ' compact' : ''}`} aria-label={label}>
      <button type="button" onClick={onDecrease} aria-label={`Giảm ${label}`}>−</button>
      <strong>{quantity}</strong>
      <button type="button" onClick={onIncrease} aria-label={`Tăng ${label}`}>+</button>
    </div>
  )
}

function MenuItemCard({
  item,
  quantity,
  onChange,
}: {
  item: QrOrderMenuItem
  quantity: number
  onChange: (delta: number) => void
}) {
  return (
    <article className="customer-menu-item">
      <div className="customer-menu-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <span>{item.name.charAt(0).toLocaleUpperCase('vi')}</span>
        )}
      </div>
      <div className="customer-menu-copy">
        <small>{getCategoryName(item)}</small>
        <h2>{item.name}</h2>
        <p>{item.description?.trim() || 'Món đang phục vụ tại nhà hàng.'}</p>
        <strong>{formatMoney(item.price)}</strong>
      </div>
      <div className="customer-menu-action">
        {quantity === 0 ? (
          <button
            type="button"
            className="customer-add-button"
            onClick={() => onChange(1)}
            aria-label={`Thêm ${item.name}`}
          >
            Thêm
          </button>
        ) : (
          <QuantityControl
            label={item.name}
            quantity={quantity}
            compact
            onDecrease={() => onChange(-1)}
            onIncrease={() => onChange(1)}
          />
        )}
      </div>
    </article>
  )
}

export function MenuView({
  table,
  menuItems,
  filteredItems,
  categories,
  category,
  keyword,
  quantities,
  onCategoryChange,
  onKeywordChange,
  onQuantityChange,
}: {
  table: QrOrderTable
  menuItems: QrOrderMenuItem[]
  filteredItems: QrOrderMenuItem[]
  categories: string[]
  category: string
  keyword: string
  quantities: Record<string, number>
  onCategoryChange: (category: string) => void
  onKeywordChange: (keyword: string) => void
  onQuantityChange: (itemId: string, delta: number) => void
}) {
  return (
    <>
      <CustomerHeader table={table} />
      <section className="customer-menu-heading">
        <h1>Bạn muốn dùng món gì?</h1>
        <p>Chọn món yêu thích và gửi thẳng đến bếp.</p>
      </section>

      <label className="customer-search">
        <SearchIcon />
        <input
          value={keyword}
          onChange={event => onKeywordChange(event.target.value)}
          placeholder="Tìm món ăn…"
          aria-label="Tìm món ăn"
        />
      </label>

      <nav className="customer-categories" aria-label="Danh mục món ăn">
        {categories.map(item => (
          <button
            type="button"
            key={item}
            className={category === item ? 'active' : ''}
            aria-current={category === item ? 'true' : undefined}
            onClick={() => onCategoryChange(item)}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="customer-menu-count">{menuItems.length} món đang phục vụ</div>

      {filteredItems.length === 0 ? (
        <section className="customer-empty-state">
          <SearchIcon />
          <h2>Không tìm thấy món phù hợp</h2>
          <p>Thử đổi từ khóa hoặc chọn danh mục khác.</p>
        </section>
      ) : (
        <section className="customer-menu-list" aria-label="Danh sách món ăn">
          {filteredItems.map(item => (
            <MenuItemCard
              key={item.id}
              item={item}
              quantity={quantities[item.id] ?? 0}
              onChange={delta => onQuantityChange(item.id, delta)}
            />
          ))}
        </section>
      )}
    </>
  )
}

export function CartBar({
  quantity,
  total,
  onOpen,
}: {
  quantity: number
  total: number
  onOpen: () => void
}) {
  return (
    <button type="button" className="customer-cart-bar" onClick={onOpen}>
      <span className="customer-cart-icon"><CartIcon /><b>{quantity}</b></span>
      <strong>Xem giỏ món</strong>
      <span>{formatMoney(total)}</span>
      <ChevronIcon />
    </button>
  )
}

export function BottomNavigation({
  activeView,
  hasOrder,
  onChange,
}: {
  activeView: CustomerView
  hasOrder: boolean
  onChange: (view: CustomerView) => void
}) {
  return (
    <nav className="customer-bottom-nav" aria-label="Điều hướng khách hàng">
      <button
        type="button"
        className={activeView === 'menu' ? 'active' : ''}
        aria-current={activeView === 'menu' ? 'page' : undefined}
        onClick={() => onChange('menu')}
      >
        <MenuIcon />
        <span>Thực đơn</span>
      </button>
      <button
        type="button"
        className={activeView === 'order' ? 'active' : ''}
        aria-current={activeView === 'order' ? 'page' : undefined}
        onClick={() => onChange('order')}
      >
        <ReceiptIcon />
        <span>Đơn của tôi</span>
        {hasOrder ? <i aria-label="Có đơn đang theo dõi" /> : null}
      </button>
      <button
        type="button"
        className={activeView === 'account' ? 'active' : ''}
        aria-current={activeView === 'account' ? 'page' : undefined}
        onClick={() => onChange('account')}
      >
        <AccountIcon />
        <span>Tài khoản</span>
      </button>
    </nav>
  )
}

export function CartDrawer({
  table,
  entries,
  orderNote,
  submitting,
  onClose,
  onQuantityChange,
  onItemNoteChange,
  onOrderNoteChange,
  onSubmit,
}: {
  table: QrOrderTable
  entries: CartEntry[]
  orderNote: string
  submitting: boolean
  onClose: () => void
  onQuantityChange: (itemId: string, delta: number) => void
  onItemNoteChange: (itemId: string, note: string) => void
  onOrderNoteChange: (note: string) => void
  onSubmit: () => void
}) {
  const quantity = entries.reduce((total, entry) => total + entry.quantity, 0)
  const total = entries.reduce(
    (sum, entry) => sum + entry.item.price * entry.quantity,
    0,
  )

  return (
    <div
      className="customer-drawer-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <section
        className="customer-cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-cart-title"
      >
        <div className="customer-drawer-handle" />
        <header>
          <div className="customer-brand compact"><span>NH</span></div>
          <h2 id="customer-cart-title">Giỏ món · {table.restaurantTableName}</h2>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Đóng giỏ món">
            <CloseIcon />
          </button>
        </header>

        <div className="customer-cart-scroll">
          <section className="customer-cart-items" aria-label="Món đã chọn">
            {entries.map(entry => (
              <article key={entry.item.id}>
                <div className="customer-cart-item-row">
                  <div className="customer-cart-image">
                    {entry.item.imageUrl ? (
                      <img src={entry.item.imageUrl} alt="" />
                    ) : (
                      <span>{entry.item.name.charAt(0).toLocaleUpperCase('vi')}</span>
                    )}
                  </div>
                  <div className="customer-cart-item-copy">
                    <h3>{entry.item.name}</h3>
                    <p>{formatMoney(entry.item.price)} × {entry.quantity}</p>
                  </div>
                  <QuantityControl
                    label={`${entry.item.name} trong giỏ`}
                    quantity={entry.quantity}
                    compact
                    onDecrease={() => onQuantityChange(entry.item.id, -1)}
                    onIncrease={() => onQuantityChange(entry.item.id, 1)}
                  />
                </div>
                <input
                  value={entry.note}
                  onChange={event => onItemNoteChange(entry.item.id, event.target.value)}
                  placeholder="Ghi chú cho món"
                  aria-label={`Ghi chú cho ${entry.item.name}`}
                  maxLength={300}
                />
              </article>
            ))}
          </section>

          <label className="customer-order-note">
            <span>Ghi chú chung cho bếp</span>
            <textarea
              value={orderNote}
              onChange={event => onOrderNoteChange(event.target.value)}
              placeholder="Ví dụ: ít cay, không hành…"
              maxLength={500}
            />
          </label>

          <div className="customer-cart-summary">
            <span><b>{quantity} món</b><small>Tạm tính</small></span>
            <strong>{formatMoney(total)}</strong>
          </div>
          <p className="customer-cart-reassurance">
            <CheckIcon /> Món sẽ được gửi đến bếp sau khi bạn xác nhận.
          </p>
        </div>

        <footer>
          <button
            type="button"
            className="customer-primary-button"
            onClick={onSubmit}
            disabled={submitting || entries.length === 0}
          >
            {submitting ? 'Đang gửi đến bếp…' : 'Xác nhận gọi món'}
          </button>
          <button type="button" className="customer-secondary-button" onClick={onClose} disabled={submitting}>
            Tiếp tục chọn món
          </button>
        </footer>
      </section>
    </div>
  )
}

const STATUS_STAGES = ['Đã nhận', 'Đang nấu', 'Sẵn sàng', 'Đã phục vụ']

function getOrderProgress(order: QrOrderResult) {
  if (order.status === 'Completed' || order.status === 'Served') return 3
  if (order.items.length > 0 && order.items.every(item => ['Ready', 'Served'].includes(item.status))) return 2
  if (order.status === 'Cooking' || order.items.some(item => item.status === 'Cooking')) return 1
  return 0
}

function getOrderStatusCopy(order: QrOrderResult) {
  if (order.status === 'Cancelled') {
    return { title: 'Đơn đã được hủy', detail: 'Vui lòng liên hệ nhân viên nếu bạn cần hỗ trợ.' }
  }
  if (order.status === 'Completed') {
    return { title: 'Đơn đã hoàn tất', detail: 'Cảm ơn bạn đã dùng bữa tại nhà hàng.' }
  }
  if (order.status === 'Served') {
    return { title: 'Món đã được phục vụ', detail: 'Chúc bạn có một bữa ăn ngon miệng.' }
  }
  if (getOrderProgress(order) === 2) {
    return { title: 'Món đã sẵn sàng', detail: 'Nhân viên sẽ mang món đến bàn ngay.' }
  }
  if (getOrderProgress(order) === 1) {
    return { title: 'Bếp đang chuẩn bị', detail: 'Món của bạn đang được chế biến.' }
  }
  return { title: 'Đã nhận đơn', detail: 'Nhà hàng đã nhận yêu cầu gọi món của bạn.' }
}

export function OrderTrackingView({
  table,
  order,
  loading,
  lastUpdatedAt,
  menuItemImages,
  onRefresh,
  onOrderMore,
}: {
  table: QrOrderTable
  order: QrOrderResult | null
  loading: boolean
  lastUpdatedAt: Date | null
  menuItemImages: Map<string, string>
  onRefresh: () => void
  onOrderMore: () => void
}) {
  if (!order) {
    return (
      <>
        <CustomerHeader table={table} />
        <section className="customer-order-heading"><h1>Đơn của tôi</h1></section>
        <section className="customer-empty-state order">
          <ReceiptIcon />
          <h2>{loading ? 'Đang tải đơn gần nhất…' : 'Bạn chưa có đơn nào'}</h2>
          <p>{loading ? 'Vui lòng chờ trong giây lát.' : 'Chọn món trong thực đơn để bắt đầu gọi món.'}</p>
          {!loading ? <button type="button" onClick={onOrderMore}>Xem thực đơn</button> : null}
        </section>
      </>
    )
  }

  const progress = getOrderProgress(order)
  const status = getOrderStatusCopy(order)

  return (
    <>
      <CustomerHeader table={table} />
      <section className="customer-order-heading">
        <div>
          <h1>Đơn của tôi</h1>
          <button type="button" onClick={onRefresh} disabled={loading}>
            <RefreshIcon /> {loading ? 'Đang cập nhật…' : lastUpdatedAt ? 'Cập nhật vừa xong' : 'Cập nhật đơn'}
          </button>
        </div>
        <small>Mã đơn hàng</small>
        <strong>{order.orderCode}</strong>
      </section>

      <section className={`customer-order-status${order.status === 'Cancelled' ? ' cancelled' : ''}`} aria-live="polite">
        <div className="customer-status-icon">{progress >= 3 ? <CheckIcon /> : <ClockIcon />}</div>
        <div><h2>{status.title}</h2><p>{status.detail}</p></div>
      </section>

      <ol className="customer-order-progress" aria-label="Tiến độ đơn hàng">
        {STATUS_STAGES.map((stage, index) => (
          <li key={stage} className={index <= progress ? 'active' : ''} aria-current={index === progress ? 'step' : undefined}>
            <span>{index < progress ? <CheckIcon /> : index + 1}</span>
            <strong>{stage}</strong>
          </li>
        ))}
      </ol>

      <section className="customer-order-items" aria-label="Chi tiết đơn">
        {order.items.map(item => {
          const imageUrl = menuItemImages.get(item.menuItemId)
          return (
            <article key={item.id}>
              <div className="customer-order-item-image">
                {imageUrl ? <img src={imageUrl} alt="" /> : <span>{item.menuItemName.charAt(0).toLocaleUpperCase('vi')}</span>}
              </div>
              <div><h3>{item.menuItemName}</h3><p>× {item.quantity}</p></div>
              <strong>{formatMoney(item.totalPrice)}</strong>
            </article>
          )
        })}
      </section>

      <div className="customer-order-total"><span>Tạm tính</span><strong>{formatMoney(order.totalAmount)}</strong></div>
      <button type="button" className="customer-order-more" onClick={onOrderMore}>Gọi thêm món</button>
    </>
  )
}

export function SuccessDialog({
  message,
  order,
  onTrack,
  onOrderMore,
}: {
  message: string
  order: QrOrderResult
  onTrack: () => void
  onOrderMore: () => void
}) {
  return (
    <div className="customer-success-backdrop">
      <section className="customer-success-card" role="status">
        <span className="customer-success-icon"><CheckIcon /></span>
        <h2>Đã gửi món đến bếp</h2>
        <p>{message}</p>
        <dl>
          <div><dt>Mã đơn</dt><dd>{order.orderCode}</dd></div>
          <div><dt>Bàn</dt><dd>{order.restaurantTableName}</dd></div>
          <div><dt>Tạm tính</dt><dd>{formatMoney(order.totalAmount)}</dd></div>
        </dl>
        <button type="button" className="customer-primary-button" onClick={onTrack}>Theo dõi đơn</button>
        <button type="button" className="customer-secondary-button" onClick={onOrderMore}>Gọi thêm món</button>
      </section>
    </div>
  )
}
