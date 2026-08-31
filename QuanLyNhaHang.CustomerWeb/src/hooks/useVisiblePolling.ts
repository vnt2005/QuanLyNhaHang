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
    let interval: number | undefined

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
      } catch {
        // Polling callbacks own their UI error state. Swallow here so an
        // interval/focus-triggered rejection never becomes unhandled.
      } finally {
        running = false
      }
    }

    const stopInterval = () => {
      if (interval === undefined) return
      window.clearInterval(interval)
      interval = undefined
    }

    const startInterval = () => {
      if (
        disposed ||
        interval !== undefined ||
        document.visibilityState !== 'visible'
      ) {
        return
      }

      interval = window.setInterval(() => void run(), intervalMs)
    }

    const resume = () => {
      if (document.visibilityState !== 'visible') return
      startInterval()
      void run()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resume()
      } else {
        stopInterval()
      }
    }

    startInterval()
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      disposed = true
      stopInterval()
      window.removeEventListener('focus', resume)
      window.removeEventListener('online', resume)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, intervalMs])
}
