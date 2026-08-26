import type { CustomerSession } from '../api/customerAuth'
import reservationImage from '../assets/reservation-dining-room.webp'
import { navigate } from '../navigation'
import AuthPanel from './AuthPanel'

export default function AuthPortal({
  initialMessage,
  onAuthenticated,
}: {
  initialMessage?: string
  onAuthenticated: (session: CustomerSession) => void
}) {
  return (
    <main className="auth-portal-page">
      <div className="auth-portal-scene" aria-hidden="true">
        <img src={reservationImage} alt="" />
        <div className="auth-portal-scene-copy">
          <strong>Ẩm thực Việt trong một không gian gần gũi</strong>
          <span>Đặt bàn, gọi món và theo dõi đơn hàng trên cùng một website.</span>
        </div>
      </div>
      <div className="auth-portal-scrim" aria-hidden="true" />
      <div className="auth-portal-dialog-wrap">
        <AuthPanel
          initialMessage={initialMessage}
          onAuthenticated={onAuthenticated}
          onClose={() => navigate('/')}
        />
      </div>
    </main>
  )
}
