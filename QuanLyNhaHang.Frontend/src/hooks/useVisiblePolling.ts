import { useEffect, useRef } from 'react'

type PollingCallback = () => void | Promise<void>

export function useVisiblePolling(
  callback: PollingCallback,
  intervalMs: number,
  enabled = true,
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    let disposed = false
    let running = false

    const run = async () => {
      if (
        disposed ||
        running ||
        document.visibilityState !== 'visible'
      ) {
        return
      }

      running = true
      try {
        await callbackRef.current()
      } finally {
        running = false
      }
    }

    const resume = () => {
      if (document.visibilityState === 'visible') {
        void run()
      }
    }

    const interval = window.setInterval(() => void run(), intervalMs)
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)

    return () => {
      disposed = true
      window.clearInterval(interval)
      window.removeEventListener('focus', resume)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', resume)
    }
  }, [enabled, intervalMs])
}
