import { useEffect, type Dispatch, type SetStateAction } from 'react'

const DEFAULT_DISMISS_DELAY = 5000

export function useAutoDismissMessage(
  message: string,
  setMessage: Dispatch<SetStateAction<string>>,
  delay = DEFAULT_DISMISS_DELAY,
) {
  useEffect(() => {
    if (!message) return

    const timer = window.setTimeout(() => setMessage(''), delay)
    return () => window.clearTimeout(timer)
  }, [delay, message, setMessage])
}
