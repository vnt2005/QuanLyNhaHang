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
  const [scrolled, setScrolled] = useState(false)
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

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', update, { passive: true })
    update()
    return () => window.removeEventListener('scroll', update)
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
    <header className="bistro-template-header-wrap">
      <div className={`bistro-template-header ${scrolled ? 'is-scrolled' : ''}`}>
        <a className="bistro-template-brand" href="/" onClick={event => follow(event, '/')}>
          <span className="bistro-template-brand-mark">
            {restaurant?.logoUrl
              ? <img src={restaurant.logoUrl} alt="" />
              : <UtensilsCrossed aria-hidden="true" />}
          </span>
          <span>
            <strong>{restaurant?.restaurantName || 'Nhà Hàng'}</strong>
            <small>Vietnamese Bistro</small>
          </span>
        </a>

        <nav className={`bistro-template-nav ${open ? 'open' : ''}`} aria-label="Điều hướng chính">
          {links.map(link => {
            const active = link.path === '/' ? pathname === '/' : pathname.startsWith(link.path)
            return (
              <a
                href={link.path}
                className={active ? 'active' : ''}
                aria-current={active ? 'page' : undefined}
                key={link.path}
                onClick={event => follow(event, link.path)}
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        <div className="bistro-template-actions">
          <Button asChild variant="ghost" size="icon" className="relative">
            <a href="/takeaway" onClick={event => follow(event, '/takeaway')} aria-label={`Giỏ mang về${cartCount ? `, ${cartCount} phần` : ''}`}>
              <ShoppingBag />
              {cartCount ? <span className="bistro-cart-badge">{cartCount > 99 ? '99+' : cartCount}</span> : null}
            </a>
          </Button>
          {session ? <NotificationCenter session={session} onSessionRefresh={onSessionRefresh} /> : null}
          <Button asChild size="sm" className="bistro-account-button">
            <a href={accountPath} onClick={event => follow(event, accountPath)}>
              <UserRound />
              <span>{accountLabel}</span>
            </a>
          </Button>
          <Button className="bistro-template-menu-toggle" variant="outline" size="icon" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Đóng menu' : 'Mở menu'}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
    </header>
  )
}
