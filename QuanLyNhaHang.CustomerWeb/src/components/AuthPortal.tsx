import type { CustomerSession } from '../services/customerAuth'
import reservationImage from '../assets/reservation-dining-room.webp'
import { navigate } from '../utils/navigation'
import AuthPanel from './AuthPanel'

export default function AuthPortal({
  initialMessage,
  onAuthenticated,
}: {
  initialMessage?: string
  onAuthenticated: (session: CustomerSession) => void
}) {
  return (
    <main className="sera-page py-10 md:py-14">
      <section className="grid min-h-[650px] border-y border-border lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative min-h-[360px] overflow-hidden bg-muted lg:min-h-full">
          <img src={reservationImage} alt="Không gian nhà hàng" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 border-t border-white/30 bg-black/70 p-6 text-white sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-white/70">Tài khoản khách hàng</p>
            <strong className="mt-2 block max-w-lg font-heading text-4xl font-medium leading-none sm:text-5xl">Một tài khoản cho những lần ghé tiếp theo.</strong>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/70">Theo dõi đơn hàng, nhận cập nhật và quản lý thông tin cá nhân trong cùng một nơi.</p>
          </div>
        </div>
        <div className="grid place-items-center px-5 py-10 sm:px-10 lg:px-14">
          <AuthPanel initialMessage={initialMessage} onAuthenticated={onAuthenticated} onClose={() => navigate('/')} />
        </div>
      </section>
    </main>
  )
}
