import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <section className="sera-empty" role={kind === 'error' ? 'alert' : 'status'}>
      <div>
        {kind === 'loading'
          ? <LoaderCircle className="mx-auto animate-spin" />
          : <AlertTriangle className={kind === 'error' ? 'mx-auto text-destructive' : 'mx-auto'} />}
        <h2>{title}</h2>
        <p>{message}</p>
        {onRetry ? <Button variant="outline" type="button" onClick={onRetry}><RefreshCw /> Thử lại</Button> : null}
      </div>
    </section>
  )
}
