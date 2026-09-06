import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export type AdminTheme = 'light' | 'dark'

export const ADMIN_THEME_STORAGE_KEY = 'qlnh-admin-theme'

const THEME_COLORS: Record<AdminTheme, string> = {
  light: '#f3f6fa',
  dark: '#07111f',
}

function isAdminTheme(value: string | null | undefined): value is AdminTheme {
  return value === 'light' || value === 'dark'
}

function readTheme(): AdminTheme {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.adminTheme
    if (isAdminTheme(current)) return current
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
      if (isAdminTheme(stored)) return stored
    } catch {
      // Storage can be unavailable in private/restricted browser contexts.
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  }

  return 'light'
}

function applyTheme(theme: AdminTheme) {
  const root = document.documentElement
  root.dataset.adminTheme = theme
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[theme])
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.5 14.2A8.4 8.4 0 0 1 9.8 3.5 8.6 8.6 0 1 0 20.5 14.2Z" />
    </svg>
  )
}

export default function AdminThemeToggle() {
  const [theme, setTheme] = useState<AdminTheme>(readTheme)
  const [topbarTarget, setTopbarTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme)
    } catch {
      // Keep the selected theme for this tab even if storage is blocked.
    }
  }, [theme])

  useEffect(() => {
    function syncTheme(event: StorageEvent) {
      if (event.key === ADMIN_THEME_STORAGE_KEY && isAdminTheme(event.newValue)) {
        setTheme(event.newValue)
      }
    }

    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  useEffect(() => {
    function resolveTarget() {
      setTopbarTarget(document.querySelector<HTMLElement>('.topbar-actions'))
    }

    resolveTarget()
    const observer = new MutationObserver(resolveTarget)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const button = (
    <button
      type="button"
      className="admin-theme-toggle"
      aria-label={`Chuyển sang chế độ ${nextTheme === 'dark' ? 'tối' : 'sáng'}`}
      title={`Chuyển sang chế độ ${nextTheme === 'dark' ? 'tối' : 'sáng'}`}
      onClick={() => setTheme(nextTheme)}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )

  if (topbarTarget) return createPortal(button, topbarTarget)

  return <div className="admin-theme-toggle-fallback">{button}</div>
}
