import { Menu, ShoppingBag, UserRound, UtensilsCrossed, X } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { CustomerSession } from '../services/customerAuth'
import type { PublicRestaurant } from '../services/customerSite'
import { navigate } from '../utils/navigation'
import { TAKEAWAY_CART_EVENT, takeawayCartCount } from '../utils/takeawayCart'
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
  const accountPath = session ? '/account' : '/login'
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

  useEffect(() => setOpen(false), [pathname])

  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    setOpen(false)
    navigate(path)
  }

  return (
    <header className="sera-header">
      <div className="sera-header-inner">
        <a className="sera-brand" href="/" onClick={event => follow(event, '/')}>
          <span className="sera-brand-mark">
            {restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="" /> : <UtensilsCrossed aria-hidden="true" />}
          </span>
          <span className="sera-brand-copy">
            <strong>{restaurant?.restaurantName || 'Nhà Hàng'}</strong>
            <small>Vietnamese dining</small>
          </span>
        </a>

        <nav className={`sera-nav ${open ? 'open' : ''}`} aria-label="Điều hướng chính">
          {links.map(link => {
            const active = link.path === '/' ? pathname === '/' : pathname.startsWith(link.path)
            return (
              <a
                href={link.path}
                key={link.path}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                onClick={event => follow(event, link.path)}
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        <div className="sera-header-actions">
          <Button asChild variant="ghost" size="icon" className="sera-cart-button">
            <a href="/takeaway" onClick={event => follow(event, '/takeaway')} aria-label={`Giỏ mang về${cartCount ? `, ${cartCount} phần` : ''}`}>
              <ShoppingBag />
              {cartCount ? <span className="sera-cart-count">{cartCount > 99 ? '99+' : cartCount}</span> : null}
            </a>
          </Button>
          {session ? <NotificationCenter session={session} onSessionRefresh={onSessionRefresh} /> : null}
          <Button asChild size="sm" variant="outline">
            <a href={accountPath} onClick={event => follow(event, accountPath)}>
              <UserRound />
              <span className="sera-account-text">{accountLabel}</span>
            </a>
          </Button>
          <Button className="sera-menu-toggle" variant="ghost" size="icon" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Đóng menu' : 'Mở menu'}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
    </header>
  )
}
