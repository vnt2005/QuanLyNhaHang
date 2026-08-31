import { useEffect, useLayoutEffect, useState } from 'react'

type CustomerLocation = {
  pathname: string
  routeKey: string
}

function readCustomerLocation(): CustomerLocation {
  const pathname = window.location.pathname
  return {
    pathname,
    routeKey: `${pathname}${window.location.search}`,
  }
}

export function useCustomerPath() {
  const [location, setLocation] = useState(readCustomerLocation)

  useEffect(() => {
    const update = () => {
      const next = readCustomerLocation()
      setLocation(current => current.routeKey === next.routeKey ? current : next)
    }
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [location.routeKey])

  return location
}
