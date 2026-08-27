import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createQrOrder,
  getQrOrder,
  getQrOrderContext,
  type QrOrderMenuItem,
  type QrOrderResult,
  type QrOrderTable,
} from '../services/qrOrders'
import {
  clearCustomerSession,
  getStoredCustomerAccessToken,
  hasStoredCustomerSession,
  logoutCustomer,
  restoreCustomerSession,
  type CustomerSession,
} from '../services/customerAuth'
import { claimCustomerOrder } from '../services/customerOrders'
import CustomerAccountView from '../components/customer/CustomerAccountView'
import CustomerOrderHistoryView from '../components/customer/CustomerOrderHistoryView'
import {
  BottomNavigation,
  CartBar,
  CartDrawer,
  getCategoryName,
  MenuView,
  OrderTrackingView,
  SuccessDialog,
  type CartEntry,
  type CustomerView,
} from '../components/orders/QrOrderUi'
import {
  clearCurrentQrOrderId,
  clearQrCart,
  readCurrentQrOrderId,
  readQrCart,
  writeCurrentQrOrderId,
  writeQrCart,
} from '../utils/qrOrderStorage'

type QrOrderPageProps = {
  token: string
}

const TERMINAL_ORDER_STATUSES = new Set(['Completed', 'Cancelled'])

export default function QrOrderPage({ token }: QrOrderPageProps) {
  const [initialCart] = useState(() => readQrCart(token))
  const [table, setTable] = useState<QrOrderTable | null>(null)
  const [menuItems, setMenuItems] = useState<QrOrderMenuItem[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>(
    initialCart.quantities,
  )
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(
    initialCart.itemNotes,
  )
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState('Tất cả')
  const [orderNote, setOrderNote] = useState('')
  const [activeView, setActiveView] = useState<CustomerView>(() =>
    readCurrentQrOrderId(token) ? 'order' : 'menu',
  )
  const [currentOrder, setCurrentOrder] = useState<QrOrderResult | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{
    message: string
    order: QrOrderResult
  } | null>(null)
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(null)
  const [customerSessionLoading, setCustomerSessionLoading] = useState(
    hasStoredCustomerSession,
  )
  const [customerAuthMessage, setCustomerAuthMessage] = useState('')
  const [customerOrderRevision, setCustomerOrderRevision] = useState(0)
  const claimedOrderKeyRef = useRef('')

  useEffect(() => {
    let active = true
    const storedOrderId = readCurrentQrOrderId(token)

    setLoading(true)
    setOrderLoading(Boolean(storedOrderId))
    setError('')

    const orderPromise = storedOrderId
      ? getQrOrder(token, storedOrderId).catch(() => null)
      : Promise.resolve(null)

    void Promise.all([getQrOrderContext(token), orderPromise])
      .then(([context, restoredOrder]) => {
        if (!active) return
        setTable(context.table)
        setMenuItems(context.menuItems)
        if (restoredOrder) {
          setCurrentOrder(restoredOrder)
          setLastUpdatedAt(new Date())
        } else if (storedOrderId) {
          clearCurrentQrOrderId(token)
        }
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
        if (!active) return
        setLoading(false)
        setOrderLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  useEffect(() => {
    if (!hasStoredCustomerSession()) {
      setCustomerSessionLoading(false)
      return
    }
    let active = true
    setCustomerSessionLoading(true)
    void restoreCustomerSession()
      .then(session => {
        if (active) setCustomerSession(session)
      })
      .catch(() => {
        if (active) {
          clearCustomerSession()
          setCustomerSession(null)
        }
      })
      .finally(() => {
        if (active) setCustomerSessionLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    writeQrCart(token, quantities, itemNotes)
  }, [itemNotes, quantities, token])

  const categories = useMemo(
    () => ['Tất cả', ...Array.from(new Set(menuItems.map(getCategoryName)))],
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

  const selectedItems = useMemo<CartEntry[]>(
    () => menuItems
      .map(item => ({
        item,
        quantity: quantities[item.id] ?? 0,
        note: itemNotes[item.id] ?? '',
      }))
      .filter(entry => entry.quantity > 0),
    [itemNotes, menuItems, quantities],
  )

  const selectedQuantity = selectedItems.reduce(
    (total, entry) => total + entry.quantity,
    0,
  )
  const totalAmount = selectedItems.reduce(
    (total, entry) => total + entry.item.price * entry.quantity,
    0,
  )

  const menuItemImages = useMemo(() => {
    const images = new Map<string, string>()
    menuItems.forEach(item => {
      if (item.imageUrl) images.set(item.id, item.imageUrl)
    })
    return images
  }, [menuItems])

  const refreshOrder = useCallback(async () => {
    const orderId = currentOrder?.id ?? readCurrentQrOrderId(token)
    if (!orderId || orderLoading) return

    setOrderLoading(true)
    setError('')
    try {
      const order = await getQrOrder(token, orderId)
      setCurrentOrder(order)
      setLastUpdatedAt(new Date())
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không cập nhật được trạng thái đơn.',
      )
    } finally {
      setOrderLoading(false)
    }
  }, [currentOrder?.id, orderLoading, token])

  useEffect(() => {
    if (!currentOrder || TERMINAL_ORDER_STATUSES.has(currentOrder.status)) return
    const timer = window.setInterval(() => void refreshOrder(), 10_000)
    return () => window.clearInterval(timer)
  }, [currentOrder, refreshOrder])

  function changeQuantity(itemId: string, delta: number) {
    if ((quantities[itemId] ?? 0) + delta <= 0) {
      setItemNotes(notes => {
        const nextNotes = { ...notes }
        delete nextNotes[itemId]
        return nextNotes
      })
    }
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

  function changeItemNote(itemId: string, note: string) {
    setItemNotes(current => ({ ...current, [itemId]: note }))
  }

  async function submitOrder() {
    if (selectedItems.length === 0 || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await createQrOrder(token, {
        note: orderNote,
        customerAccessToken: customerSession
          ? getStoredCustomerAccessToken() ?? customerSession.token
          : null,
        items: selectedItems.map(entry => ({
          menuItemId: entry.item.id,
          quantity: entry.quantity,
          note: entry.note,
        })),
      })
      setCurrentOrder(result.data)
      setLastUpdatedAt(new Date())
      writeCurrentQrOrderId(token, result.data.id)
      clearQrCart(token)
      setQuantities({})
      setItemNotes({})
      setOrderNote('')
      setCartOpen(false)
      setSuccess({ message: result.message, order: result.data })
      if (customerSession) {
        setCustomerOrderRevision(value => value + 1)
      }
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

  function showMenu() {
    setSuccess(null)
    setActiveView('menu')
    setKeyword('')
    setCategory('Tất cả')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function showOrder() {
    setSuccess(null)
    setActiveView('order')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (!customerSession && currentOrder) void refreshOrder()
  }

  function showAccount() {
    setSuccess(null)
    setActiveView('account')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const attachCurrentOrderToCustomer = useCallback(async (session: CustomerSession) => {
    const orderId = currentOrder?.id ?? readCurrentQrOrderId(token)
    if (!orderId) return
    const claimKey = `${session.userId}:${orderId}`
    if (claimedOrderKeyRef.current === claimKey) return
    claimedOrderKeyRef.current = claimKey

    try {
      await claimCustomerOrder(session.token, token, orderId)
      setCustomerOrderRevision(value => value + 1)
    } catch (exception) {
      claimedOrderKeyRef.current = ''
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không thể lưu đơn hiện tại vào tài khoản.',
      )
    }
  }, [currentOrder?.id, token])

  useEffect(() => {
    if (customerSession) void attachCurrentOrderToCustomer(customerSession)
  }, [attachCurrentOrderToCustomer, customerSession])

  function handleCustomerAuthenticated(session: CustomerSession) {
    setCustomerSession(session)
    setCustomerAuthMessage('')
  }

  const handleCustomerSessionEnded = useCallback((message = '') => {
    clearCustomerSession()
    setCustomerSession(null)
    setCustomerAuthMessage(message)
  }, [])

  async function handleCustomerLogout() {
    try {
      await logoutCustomer()
    } finally {
      setCustomerSession(null)
      setCustomerAuthMessage('Bạn đã đăng xuất khỏi tài khoản khách hàng.')
    }
  }

  function changeView(view: CustomerView) {
    if (view === 'menu') showMenu()
    else if (view === 'order') showOrder()
    else showAccount()
  }

  if (loading) {
    return (
      <main className="qr-order-page customer-state-page">
        <div className="customer-state-card" role="status">
          <span className="customer-spinner" />
          <h1>Đang mở thực đơn…</h1>
          <p>Hệ thống đang kiểm tra mã QR và tải các món đang phục vụ.</p>
        </div>
      </main>
    )
  }

  if (!table || (error && menuItems.length === 0)) {
    return (
      <main className="qr-order-page customer-state-page">
        <div className="customer-state-card error" role="alert">
          <span className="customer-state-icon">!</span>
          <h1>Không thể mở thực đơn</h1>
          <p>{error || 'Mã QR không hợp lệ hoặc đã ngừng hoạt động.'}</p>
          <button type="button" onClick={() => window.location.reload()}>Thử lại</button>
        </div>
      </main>
    )
  }

  return (
    <main className={`qr-order-page customer-view-${activeView}`}>
      <div className="customer-app-shell">
        {error ? (
          <div className="customer-alert" role="alert">
            <span>!</span><p>{error}</p>
            <button type="button" onClick={() => setError('')} aria-label="Đóng thông báo">×</button>
          </div>
        ) : null}

        {activeView === 'menu' ? (
          <MenuView
            table={table}
            menuItems={menuItems}
            filteredItems={filteredItems}
            categories={categories}
            category={category}
            keyword={keyword}
            quantities={quantities}
            onCategoryChange={setCategory}
            onKeywordChange={setKeyword}
            onQuantityChange={changeQuantity}
          />
        ) : activeView === 'order' ? (
          customerSession ? (
            <CustomerOrderHistoryView
              table={table}
              session={customerSession}
              revision={customerOrderRevision}
              onOrderMore={showMenu}
              onSessionEnded={handleCustomerSessionEnded}
            />
          ) : (
            <OrderTrackingView
              table={table}
              order={currentOrder}
              loading={orderLoading}
              lastUpdatedAt={lastUpdatedAt}
              menuItemImages={menuItemImages}
              onRefresh={() => void refreshOrder()}
              onOrderMore={showMenu}
            />
          )
        ) : (
          <CustomerAccountView
            session={customerSession}
            sessionLoading={customerSessionLoading}
            initialMessage={customerAuthMessage}
            onAuthenticated={handleCustomerAuthenticated}
            onSessionEnded={handleCustomerSessionEnded}
            onShowMenu={showMenu}
            onShowOrder={showOrder}
            onLogout={handleCustomerLogout}
          />
        )}
      </div>

      {activeView === 'menu' && selectedQuantity > 0 ? (
        <CartBar quantity={selectedQuantity} total={totalAmount} onOpen={() => setCartOpen(true)} />
      ) : null}

      <BottomNavigation
        activeView={activeView}
        hasOrder={Boolean(currentOrder)}
        onChange={changeView}
      />

      {cartOpen ? (
        <CartDrawer
          table={table}
          entries={selectedItems}
          orderNote={orderNote}
          submitting={submitting}
          onClose={() => setCartOpen(false)}
          onQuantityChange={changeQuantity}
          onItemNoteChange={changeItemNote}
          onOrderNoteChange={setOrderNote}
          onSubmit={() => void submitOrder()}
        />
      ) : null}

      {success ? (
        <SuccessDialog
          message={success.message}
          order={success.order}
          onTrack={showOrder}
          onOrderMore={showMenu}
        />
      ) : null}
    </main>
  )
}
