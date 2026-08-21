import { Menu, ShoppingBag, UserRound, X } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import type { CustomerSession } from '../api/customerAuth'
import type { PublicRestaurant } from '../api/customerSite'
import { navigate } from '../navigation'
import { TAKEAWAY_CART_EVENT, takeawayCartCount } from '../takeawayCart'
import NotificationCenter from './NotificationCenter'

const links = [
  { label: 'Trang chủ', path: '/' },
  { label: 'Thực đơn', path: '/menu' },
  { label: 'Mang về', path: '/takeaway' },
  { label: 'Đặt bàn', path: '/reservation' },
  { label: 'Đơn của tôi', path: '/orders' },
]

export default function SiteHeader({
  restaurant,
  session,
  pathname,
  onSessionRefresh,
}: {
  restaurant: PublicRestaurant | null
  session: CustomerSession | null
  pathname: string
  onSessionRefresh: () => Promise<CustomerSession | null>
}) {
  const [open, setOpen] = useState(false)
  const [cartCount, setCartCount] = useState(() => takeawayCartCount())
  const accountPath = session ? '/orders' : '/login'
  const accountLabel = session ? [session.ho, session.ten].filter(Boolean).join(' ') : 'Đăng nhập'

  useEffect(() => {
    const updateCart = () => setCartCount(takeawayCartCount())
    window.addEventListener(TAKEAWAY_CART_EVENT, updateCart)
    window.addEventListener('storage', updateCart)
    return () => {
      window.removeEventListener(TAKEAWAY_CART_EVENT, updateCart)
      window.removeEventListener('storage', updateCart)
    }
  }, [])

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    go(path)
  }

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand" href="/" onClick={event => follow(event, '/')}>
          {restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : null}
          <span>{restaurant?.restaurantName || 'Nhà Hàng'}</span>
        </a>

        <nav className={open ? 'site-nav open' : 'site-nav'} aria-label="Điều hướng chính">
          {links.map(link => {
            const active = link.path === '/' ? pathname === '/' : pathname.startsWith(link.path)
            return <a href={link.path} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} key={link.path} onClick={event => follow(event, link.path)}>{link.label}</a>
          })}
        </nav>

        <div className="site-header-actions">
          <a className="takeaway-cart-link" href="/takeaway" aria-label={`Giỏ mang về${cartCount ? `, ${cartCount} phần` : ''}`} onClick={event => follow(event, '/takeaway')}>
            <ShoppingBag aria-hidden="true" />
            {cartCount ? <span>{cartCount > 99 ? '99+' : cartCount}</span> : null}
          </a>
          {session
            ? <NotificationCenter
                session={session}
                onSessionRefresh={onSessionRefresh}
              />
            : null}
          <a className="account-link" href={accountPath} onClick={event => follow(event, accountPath)}><UserRound aria-hidden="true" /><span>{accountLabel}</span></a>
        </div>

        <button className="mobile-menu-button" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Đóng menu' : 'Mở menu'}>{open ? <X /> : <Menu />}</button>
      </div>
    </header>
  )
}
