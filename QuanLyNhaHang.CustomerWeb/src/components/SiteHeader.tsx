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
    <header className="sticky top-0 z-50 border-b border-border bg-background/96 backdrop-blur supports-[backdrop-filter]:bg-background/88">
      <div className="mx-auto grid h-[88px] w-[min(1440px,calc(100vw-48px))] grid-cols-[1fr_auto] items-center gap-6 sm:w-[min(1440px,calc(100vw-80px))] xl:grid-cols-[minmax(240px,1fr)_auto_minmax(240px,1fr)]">
        <a className="flex w-fit items-center gap-3 text-foreground no-underline" href="/" onClick={event => follow(event, '/')}>
          <span className="grid size-10 place-items-center border border-border bg-foreground text-background">
            {restaurant?.logoUrl ? <img src={restaurant.logoUrl} alt="" className="size-full object-contain p-1" /> : <UtensilsCrossed aria-hidden="true" className="size-4" />}
          </span>
          <span className="grid leading-none">
            <strong className="font-heading text-xl font-medium tracking-tight">{restaurant?.restaurantName || 'Nhà Hàng'}</strong>
            <small className="mt-1 text-[10px] font-semibold tracking-[0.24em] text-muted-foreground uppercase">Ẩm thực Việt</small>
          </span>
        </a>

        <nav className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-[88px] flex-col border-b border-border bg-background px-6 py-5 shadow-sm xl:static xl:flex xl:flex-row xl:items-center xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none`} aria-label="Điều hướng chính">
          {links.map(link => {
            const active = link.path === '/' ? pathname === '/' : pathname.startsWith(link.path)
            return (
              <a
                href={link.path}
                className={`border-b px-1 py-3 text-xs font-semibold tracking-[0.16em] uppercase no-underline transition-colors xl:mx-4 xl:border-b-2 xl:py-2 ${active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                aria-current={active ? 'page' : undefined}
                key={link.path}
                onClick={event => follow(event, link.path)}
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        <div className="hidden items-center justify-end gap-2 xl:flex">
          <Button asChild variant="ghost" size="sm">
            <a href="/takeaway" onClick={event => follow(event, '/takeaway')} aria-label={`Giỏ mang về${cartCount ? `, ${cartCount} phần` : ''}`}>
              <ShoppingBag data-icon="inline-start" />
              Giỏ
              {cartCount ? <span className="ml-1 inline-flex min-w-5 justify-center border border-border px-1 text-[10px]">{cartCount > 99 ? '99+' : cartCount}</span> : null}
            </a>
          </Button>
          {session ? <NotificationCenter session={session} onSessionRefresh={onSessionRefresh} /> : null}
          <Button asChild variant="outline" size="sm">
            <a href={accountPath} onClick={event => follow(event, accountPath)}>
              <UserRound data-icon="inline-start" />
              <span className="max-w-28 truncate">{accountLabel}</span>
            </a>
          </Button>
        </div>

        <Button className="justify-self-end xl:hidden" variant="ghost" size="icon" type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Đóng menu' : 'Mở menu'}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
    </header>
  )
}
