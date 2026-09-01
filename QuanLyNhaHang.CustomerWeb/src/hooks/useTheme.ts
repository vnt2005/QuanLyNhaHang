import { useEffect, useState } from 'react'

export type CustomerTheme = 'light' | 'dark'

export const CUSTOMER_THEME_STORAGE_KEY = 'qlnh-customer-theme'

const THEME_COLORS: Record<CustomerTheme, string> = {
  light: '#fdfcf9',
  dark: '#171411',
}

function isCustomerTheme(value: string | null | undefined): value is CustomerTheme {
  return value === 'light' || value === 'dark'
}

function readTheme(): CustomerTheme {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.theme
    if (isCustomerTheme(current)) return current
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(CUSTOMER_THEME_STORAGE_KEY)
      if (isCustomerTheme(stored)) return stored
    } catch {
      // Storage may be unavailable in private/restricted browser contexts.
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  }

  return 'light'
}

function applyTheme(theme: CustomerTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}

export function useTheme() {
  const [theme, setTheme] = useState<CustomerTheme>(readTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(CUSTOMER_THEME_STORAGE_KEY, theme)
    } catch {
      // The active tab still keeps the selected theme when storage is blocked.
    }
  }, [theme])

  useEffect(() => {
    function syncTheme(event: StorageEvent) {
      if (event.key === CUSTOMER_THEME_STORAGE_KEY && isCustomerTheme(event.newValue)) {
        setTheme(event.newValue)
      }
    }

    window.addEventListener('storage', syncTheme)
    return () => window.removeEventListener('storage', syncTheme)
  }, [])

  return {
    theme,
    toggleTheme: () => setTheme(current => current === 'dark' ? 'light' : 'dark'),
  }
}
