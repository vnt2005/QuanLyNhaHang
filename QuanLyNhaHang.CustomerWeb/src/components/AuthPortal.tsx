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
    <main className="grid min-h-[calc(100vh-88px)] bg-background lg:grid-cols-[1.05fr_.95fr]">
      <div className="relative hidden overflow-hidden border-r border-border bg-muted lg:block">
        <img src={reservationImage} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" aria-hidden="true" />
        <div className="absolute inset-x-10 bottom-10 max-w-xl text-white xl:inset-x-16 xl:bottom-14">
          <p className="text-[10px] font-semibold tracking-[0.24em] uppercase">VNT · Ẩm thực Việt</p>
          <strong className="mt-4 block font-heading text-5xl font-medium leading-[1.02] xl:text-6xl">Một tài khoản cho những lần ghé tiếp theo.</strong>
          <span className="mt-5 block max-w-lg text-sm leading-7 text-white/75">Theo dõi đơn hàng, quản lý tài khoản và nhận cập nhật từ nhà hàng trên cùng một nơi.</span>
        </div>
      </div>
      <div className="grid place-items-center px-6 py-12 sm:px-10 lg:px-14">
        <AuthPanel initialMessage={initialMessage} onAuthenticated={onAuthenticated} onClose={() => navigate('/')} />
      </div>
    </main>
  )
}
