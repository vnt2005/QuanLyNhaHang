import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'

export default function StatusPanel({
  kind,
  title,
  message,
  onRetry,
}: {
  kind: 'loading' | 'error' | 'empty'
  title: string
  message: string
  onRetry?: () => void
}) {
  return (
    <section className={`status-panel ${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {kind === 'loading' ? <LoaderCircle className="spin" /> : <AlertTriangle />}
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          <RefreshCw /> Thử lại
        </button>
      ) : null}
    </section>
  )
}
