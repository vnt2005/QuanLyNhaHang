import { useEffect, useRef, useState } from 'react'

type ConfirmTone = 'primary' | 'danger'

type ConfirmOptions = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

type ConfirmRequest = Required<ConfirmOptions> & {
  id: number
  message: string
  resolve: (accepted: boolean) => void
}

let requestId = 0
let requestHandler: ((request: ConfirmRequest) => void) | null = null
const waitingRequests: ConfirmRequest[] = []

function inferOptions(message: string): Required<ConfirmOptions> {
  const normalized = message.toLocaleLowerCase('vi')

  if (normalized.includes('xóa') && normalized.includes('tài khoản')) {
    return {
      title: 'Xóa tài khoản?',
      confirmLabel: 'Xóa tài khoản',
      cancelLabel: 'Giữ tài khoản',
      tone: 'danger',
    }
  }

  if (normalized.includes('hủy hóa đơn')) {
    return {
      title: 'Hủy hóa đơn?',
      confirmLabel: 'Hủy hóa đơn',
      cancelLabel: 'Giữ hóa đơn',
      tone: 'danger',
    }
  }

  if (normalized.includes('vô hiệu') && normalized.includes('vai trò')) {
    return {
      title: 'Vô hiệu hóa vai trò?',
      confirmLabel: 'Vô hiệu hóa',
      cancelLabel: 'Giữ hoạt động',
      tone: 'danger',
    }
  }

  if (normalized.includes('xóa')) {
    return {
      title: 'Xác nhận xóa',
      confirmLabel: 'Xóa',
      cancelLabel: 'Không xóa',
      tone: 'danger',
    }
  }

  if (normalized.includes('hủy')) {
    return {
      title: 'Xác nhận hủy',
      confirmLabel: 'Tiếp tục hủy',
      cancelLabel: 'Quay lại',
      tone: 'danger',
    }
  }

  if (
    normalized.includes('vô hiệu') ||
    normalized.includes('khóa') ||
    normalized.includes('thu hồi') ||
    normalized.includes('ngừng hoạt động') ||
    normalized.includes('đăng xuất') ||
    normalized.includes('bỏ toàn bộ')
  ) {
    return {
      title: 'Xác nhận thay đổi quan trọng',
      confirmLabel: 'Tiếp tục',
      cancelLabel: 'Quay lại',
      tone: 'danger',
    }
  }

  return {
    title: 'Xác nhận thay đổi',
    confirmLabel: 'Xác nhận',
    cancelLabel: 'Quay lại',
    tone: 'primary',
  }
}

export function confirmAction(message: string, options: ConfirmOptions = {}) {
  const inferred = inferOptions(message)

  return new Promise<boolean>(resolve => {
    const request: ConfirmRequest = {
      ...inferred,
      ...options,
      id: ++requestId,
      message,
      resolve,
    }

    if (requestHandler) requestHandler(request)
    else waitingRequests.push(request)
  })
}

export function ConfirmDialogHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    requestHandler = nextRequest => {
      setRequest(current => {
        if (current) {
          waitingRequests.push(nextRequest)
          return current
        }
        return nextRequest
      })
    }

    const firstRequest = waitingRequests.shift()
    if (firstRequest) setRequest(firstRequest)

    return () => {
      requestHandler = null
      waitingRequests.splice(0).forEach(item => item.resolve(false))
    }
  }, [])

  useEffect(() => {
    if (!request) return

    confirmButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [request])

  function finish(accepted: boolean) {
    if (!request) return
    request.resolve(accepted)
    setRequest(waitingRequests.shift() ?? null)
  }

  if (!request) return null

  return (
    <div className="ds-confirm-backdrop" onMouseDown={() => finish(false)}>
      <section
        className={`ds-confirm-dialog ${request.tone}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`ds-confirm-title-${request.id}`}
        aria-describedby={`ds-confirm-message-${request.id}`}
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="ds-confirm-icon" aria-hidden="true">
          {request.tone === 'danger' ? '!' : '✓'}
        </div>
        <div className="ds-confirm-copy">
          <span>VUI LÒNG KIỂM TRA</span>
          <h2 id={`ds-confirm-title-${request.id}`}>{request.title}</h2>
          <p id={`ds-confirm-message-${request.id}`}>{request.message}</p>
        </div>
        <div className="ds-confirm-actions">
          <button type="button" onClick={() => finish(false)}>
            {request.cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            className={request.tone === 'danger' ? 'danger' : 'primary'}
            onClick={() => finish(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
