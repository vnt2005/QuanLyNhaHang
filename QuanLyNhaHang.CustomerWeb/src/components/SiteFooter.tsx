import {
  Award,
  Car,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import type { PublicRestaurant } from '../services/customerSite'
import { navigate } from '../utils/navigation'

type PolicyDocId = 'food-safety' | 'refund-cancel' | 'delivery-terms' | 'privacy'

type PolicyDocument = {
  id: PolicyDocId
  badge: string
  title: string
  subtitle: string
  codeLabel: string
  issuedBy: string
  sections: Array<{
    heading: string
    items: string[]
  }>
}

const POLICY_DOCUMENTS: Record<PolicyDocId, PolicyDocument> = {
  'food-safety': {
    id: 'food-safety',
    badge: 'Chứng nhận Vệ sinh An toàn Thực phẩm · Hạng A',
    title: 'Giấy chứng nhận & Cam kết An toàn Thực phẩm (ATTP)',
    subtitle:
      'Toàn bộ khu vực sơ chế, bếp nấu và quy trình đóng gói giao hàng tại nhà hàng tuân thủ nghiêm ngặt tiêu chuẩn của Bộ Y tế.',
    codeLabel: 'Số GCN: ATTP-KH/2025/0842',
    issuedBy: 'Cấp bởi: Chi cục An toàn Vệ sinh Thực phẩm Tỉnh Khánh Hòa',
    sections: [
      {
        heading: '1. Kiểm soát nguồn gốc nguyên liệu tươi sống mỗi sáng',
        items: [
          'Hải sản (cá hồi, tôm biển, mực) và thịt bò/gà được nhập mới từ 05:30 sáng mỗi ngày từ các nhà cung cấp đạt chuẩn VietGAP tại Nha Trang – Khánh Hòa.',
          'Rau sống, thảo mộc và trái cây tráng miệng được rửa qua hệ thống sục ozone khử khuẩn 3 bước trước khi đưa vào khu vực chế biến.',
          'Tuyệt đối không sử dụng phẩm màu công nghiệp, chất bảo quản hay dầu chiên đi chiên lại quá 1 lần.',
        ],
      },
      {
        heading: '2. Quy trình Kiểm thực 3 bước & Lưu mẫu thức ăn 24 giờ',
        items: [
          'Thực hiện đầy đủ quy trình kiểm thực 3 bước (Trước khi nhập nguyên liệu – Trước khi chế biến – Trước khi phục vụ/đóng gói) theo Quyết định 1246/QĐ-BYT.',
          'Mọi mẻ nước dùng lẩu, súp và món chính trong ngày đều được lưu mẫu niêm phong ở nhiệt độ tiêu chuẩn протягом 24 giờ để đảm bảo truy xuất minh bạch.',
          'Đối với khách hàng có tiền sử dị ứng (hải sản, đậu phộng, gluten), bếp sử dụng bộ thớt, dao và nồi/chảo riêng biệt khi khách tích chọn trên thực đơn.',
        ],
      },
      {
        heading: '3. Tiêu chuẩn bao bì Giao hàng & Mang về',
        items: [
          'Sử dụng 100% hộp giấy Kraft phủ màng chống thấm thực phẩm và hộp bã mía sinh học chịu nhiệt đến 120°C, không thôi nhiễm vi nhựa khi đựng nước lẩu/canh nóng.',
          'Dán tem niêm phong an toàn thực phẩm (Tamper-evident seal) có ghi rõ giờ đóng gói trước khi bàn giao cho tài xế.',
        ],
      },
    ],
  },
  'refund-cancel': {
    id: 'refund-cancel',
    badge: 'Bảo vệ Quyền lợi Thực khách 100%',
    title: 'Chính sách Hủy đơn, Đổi món & Hoàn tiền',
    subtitle:
      'Cam kết xử lý minh bạch, nhanh chóng trong vòng 15 phút nếu trải nghiệm món ăn không đúng với tiêu chuẩn nhà hàng.',
    codeLabel: 'Hiệu lực: Áp dụng cho Tại bàn, Mang về & Giao tận nơi',
    issuedBy: 'Hotline xử lý khiếu nại ưu tiên: 1900 6868 / Zalo OA',
    sections: [
      {
        heading: '1. Quy định Hủy hoặc Thay đổi đơn đặt món',
        items: [
          'Khách hàng có thể tự hủy đơn trực tiếp trên website (mục Đơn của tôi) hoàn toàn miễn phí khi đơn đang ở trạng thái "Đang chờ" (Bếp chưa bắt đầu chế biến).',
          'Khi đơn đã chuyển sang trạng thái "Đang chuẩn bị / Đang chế biến", nếu cần đổi món hoặc thay đổi giờ nhận, vui lòng liên hệ Hotline nhà hàng để được hỗ trợ điều chỉnh.',
        ],
      },
      {
        heading: '2. Trường hợp được Đổi món mới 100% hoặc Hoàn tiền ngay',
        items: [
          'Món ăn giao tới bị đổ vỡ, bung nắp hộp giữ nhiệt hoặc giảm chất lượng nghiêm trọng trong quá trình vận chuyển.',
          'Giao sai món, thiếu món, thiếu topping đã thanh toán hoặc chế biến sai yêu cầu dị ứng mà khách đã ghi chú trên đơn.',
          'Thực khách chỉ cần chụp ảnh tình trạng món trong vòng 30 phút kể từ lúc nhận hàng và gửi qua Zalo OA hoặc Hotline: Nhà hàng sẽ gửi lại món mới miễn phí ship hoặc hoàn tiền 100% qua tài khoản ngân hàng/ví điện tử trong 15 phút.',
        ],
      },
    ],
  },
  'delivery-terms': {
    id: 'delivery-terms',
    badge: 'Đóng gói & Giữ nhiệt Chuẩn nhà hàng',
    title: 'Chính sách Đặt món mang về & Đặt bàn',
    subtitle:
      'Đảm bảo món ăn giữ nguyên độ nóng và hương vị khi quý khách đến nhận món tại quầy.',
    codeLabel: 'Hình thức: Nhận món tại quầy (Takeaway) & Tại bàn',
    issuedBy: 'Bộ phận Bếp & Điều phối dịch vụ nhà hàng',
    sections: [
      {
        heading: '1. Quy định chuẩn bị & Nhận món mang về',
        items: [
          'Quý khách chọn giờ nhận món mong muốn khi đặt đơn trên website. Bếp sẽ canh thời gian chuẩn bị để món vừa chín tới khi khách đến.',
          'Món ăn được đóng gói kỹ lưỡng bằng bao bì giấy và hộp giữ nhiệt, nước canh / xốt được tách riêng.',
          'Vui lòng cung cấp đúng số điện thoại và mã đơn hàng khi đến quầy lễ tân nhận món.',
        ],
      },
      {
        heading: '2. Quy định Đặt bàn trước & Giữ chỗ',
        items: [
          'Đặt bàn trực tuyến thuận tiện, hỗ trợ chọn khu vực và số lượng khách.',
          'Nhà hàng giữ bàn tối đa 15 phút so với giờ hẹn. Nếu quý khách đến trễ hơn, vui lòng gọi Hotline để nhà hàng hỗ trợ giữ vị trí bàn tốt nhất.',
        ],
      },
    ],
  },
  privacy: {
    id: 'privacy',
    badge: 'Tuân thủ Nghị định 13/2023/NĐ-CP',
    title: 'Chính sách Bảo vệ Dữ liệu Cá nhân Khách hàng',
    subtitle:
      'Tôn trọng quyền riêng tư và bảo mật tuyệt đối thông tin liên hệ, địa chỉ giao hàng cũng như lịch sử dùng bữa của thực khách.',
    codeLabel: 'Tiêu chuẩn: Bảo mật SSL/TLS & Phân quyền dữ liệu',
    issuedBy: 'Ban Quản trị Hệ thống Công nghệ VNT Dining',
    sections: [
      {
        heading: '1. Phạm vi và mục đích thu thập thông tin',
        items: [
          'Nhà hàng chỉ thu thập Họ tên, Số điện thoại, Email (tùy chọn) và Địa chỉ giao hàng nhằm mục đích xác nhận đơn đặt bàn, giao món tận nơi và gửi thông báo trạng thái đơn.',
          'Lưu trữ tùy chọn khẩu vị & cảnh báo dị ứng trên thiết bị của bạn để giúp các lần đặt món tiếp theo nhanh chóng, an toàn hơn.',
        ],
      },
      {
        heading: '2. Cam kết không chia sẻ dữ liệu & Quyền của khách hàng',
        items: [
          'Tuyệt đối không bán, trao đổi hoặc chia sẻ số điện thoại/địa chỉ của khách hàng cho bất kỳ bên thứ ba quảng cáo nào.',
          'Thực khách có toàn quyền chỉnh sửa thông tin cá nhân hoặc yêu cầu xóa lịch sử dữ liệu tài khoản bất cứ lúc nào tại mục "Tài khoản của tôi".',
        ],
      },
    ],
  },
}

const SOCIAL_CHANNELS = [
  {
    id: 'facebook',
    name: 'Facebook Fanpage',
    handle: 'fb.com/vnt.vietnamesedining',
    badge: '48K theo dõi',
    href: 'https://www.facebook.com',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@vnt.dining.nhatrang',
    badge: 'Ảnh không gian & món mới',
    href: 'https://www.instagram.com',
  },
  {
    id: 'tiktok',
    name: 'TikTok Kitchen',
    handle: '@vnt.kitchen',
    badge: 'Video hậu trường bếp',
    href: 'https://www.tiktok.com',
  },
  {
    id: 'zalo',
    name: 'Zalo Official Account',
    handle: 'Zalo OA Nhà hàng VNT',
    badge: 'Chat đặt bàn & CSKH 24/7',
    href: 'https://zalo.me',
  },
]

function SocialBrandIcon({ id }: { id: string }) {
  if (id === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13.5 21v-7.5h2.5l.38-3h-2.88V8.62c0-.87.24-1.46 1.49-1.46H16.5V4.5a21.4 21.4 0 0 0-2.28-.12c-2.26 0-3.81 1.38-3.81 3.91v2.21H8v3h2.41V21h3.09Z" />
      </svg>
    )
  }
  if (id === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (id === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
      </svg>
    )
  }
  return <MessageCircle aria-hidden="true" />
}

export default function SiteFooter({
  restaurant,
}: {
  restaurant: PublicRestaurant | null
  home?: boolean
}) {
  const [activePolicyId, setActivePolicyId] = useState<PolicyDocId | null>(null)

  const name = restaurant?.restaurantName || 'VNT Vietnamese Dining'
  const fullAddress =
    restaurant?.address && restaurant.address.length > 12
      ? restaurant.address
      : '78 Trần Phú, Phường Lộc Thọ, TP. Nha Trang, Khánh Hòa'
  const phoneDisplay = restaurant?.phoneNumber || '0258 3826 888'
  const emailDisplay = restaurant?.email || 'lienhe@vntdining.vn'
  const googleMapsDirectionsUrl =
    'https://www.google.com/maps/dir/?api=1&destination=12.2388,109.1967'
  const googleMapsEmbedUrl =
    'https://maps.google.com/maps?q=12.2388,109.1967&hl=vi&z=15&output=embed'

  const activePolicy = activePolicyId ? POLICY_DOCUMENTS[activePolicyId] : null

  function follow(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(path)
  }

  return (
    <footer className="sera-footer">
      {/* 1. KHỐI BẢN ĐỒ GOOGLE MAPS NHÚNG TRỰC TIẾP & CHỈ ĐƯỜNG ĐẾN NHÀ HÀNG */}
      <section
        className="sera-footer-map-section"
        aria-labelledby="footer-map-heading"
      >
        <div className="sera-footer-map-card">
          <div className="sera-footer-map-info">
            <p className="sera-kicker">Vị trí nhà hàng & Chỉ đường trực tiếp</p>
            <h2 id="footer-map-heading" className="sera-footer-map-title">
              Ghé thăm không gian {name} tại trung tâm biển Nha Trang.
            </h2>

            <div className="sera-footer-location-details">
              <div className="sera-footer-loc-item">
                <MapPin className="sera-footer-loc-icon" aria-hidden="true" />
                <div>
                  <strong>Địa chỉ đón khách & nhận món mang về</strong>
                  <span>{fullAddress}</span>
                </div>
              </div>

              <div className="sera-footer-loc-item">
                <Clock3 className="sera-footer-loc-icon" aria-hidden="true" />
                <div>
                  <strong>Khung giờ mở cửa phục vụ mỗi ngày</strong>
                  <span>
                    {restaurant
                      ? `${restaurant.openingTime} – ${restaurant.closingTime}`
                      : '07:00 – 23:00'}{' '}
                    (Nhận đơn giao tận nơi đến 22:30)
                  </span>
                </div>
              </div>

              <div className="sera-footer-loc-item">
                <Car className="sera-footer-loc-icon" aria-hidden="true" />
                <div>
                  <strong>Tiện ích đỗ xe & Đón tiếp đoàn</strong>
                  <span>
                    Có bãi đỗ xe ô tô 4–45 chỗ miễn phí trước sảnh, thang máy
                    lên phòng VIP và lối đi thuận tiện cho xe đẩy trẻ em.
                  </span>
                </div>
              </div>
            </div>

            <div className="sera-footer-map-actions">
              <Button asChild size="lg">
                <a
                  href={googleMapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation aria-hidden="true" /> Mở Google Maps chỉ đường
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                type="button"
                onClick={() => navigate('/reservation')}
              >
                Đặt bàn giữ chỗ trước
              </Button>
            </div>
          </div>

          <div className="sera-footer-map-embed-wrap">
            <iframe
              title={`Bản đồ vị trí nhà hàng ${name} tại Nha Trang`}
              src={googleMapsEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="sera-footer-map-iframe"
              allowFullScreen
            />
            <div className="sera-footer-map-overlay-bar">
              <span>📍 Tọa độ: 12.2388° N, 109.1967° E · Lộc Thọ, Nha Trang</span>
              <a
                href={googleMapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sera-link"
              >
                Phóng to bản đồ <ExternalLink className="inline size-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BỐN CỘT THÔNG TIN CHÍNH: THƯƠNG HIỆU & MXH · KHÁM PHÁ · CHÍNH SÁCH & ATTP · LIÊN HỆ */}
      <section className="sera-footer-main">
        {/* Cột 1: Thương hiệu & Kênh Mạng xã hội */}
        <div className="sera-footer-col-brand">
          <a
            className="sera-brand"
            href="/"
            onClick={event => follow(event, '/')}
          >
            <span className="sera-brand-mark">
              {restaurant?.logoUrl ? (
                <img src={restaurant.logoUrl} alt="" />
              ) : (
                <UtensilsCrossed />
              )}
            </span>
            <span className="sera-brand-copy">
              <strong>{name}</strong>
              <small>Vietnamese dining · Nha Trang</small>
            </span>
          </a>
          <p className="sera-footer-brand-desc">
            {restaurant?.welcomeMessage ||
              'Ẩm thực Việt truyền thống chế biến từ hải sản và nguyên liệu tươi bản địa mỗi ngày. Phục vụ tại bàn, phòng VIP, đặt mang về và giao nóng tận nơi.'}
          </p>

          <div className="sera-footer-socials">
            <span className="sera-footer-socials-title">
              Kết nối với nhà hàng trên mạng xã hội
            </span>
            <div className="sera-social-grid">
              {SOCIAL_CHANNELS.map(channel => (
                <a
                  key={channel.id}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`sera-social-card is-${channel.id}`}
                  aria-label={`${channel.name} - ${channel.handle}`}
                >
                  <span className="sera-social-icon">
                    <SocialBrandIcon id={channel.id} />
                  </span>
                  <span className="sera-social-copy">
                    <strong>{channel.name}</strong>
                    <small>{channel.badge}</small>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Cột 2: Khám phá & Dịch vụ */}
        <nav className="sera-footer-links" aria-label="Liên kết khám phá">
          <h3>Trải nghiệm & Đặt món</h3>
          <a href="/" onClick={event => follow(event, '/')}>
            Trang chủ & Ưu đãi
          </a>
          <a href="/menu" onClick={event => follow(event, '/menu')}>
            Thực đơn nhà hàng
          </a>
          <a href="/takeaway" onClick={event => follow(event, '/takeaway')}>
            Đặt mang về (Takeaway)
          </a>
          <a
            href="/reservation"
            onClick={event => follow(event, '/reservation')}
          >
            Đặt bàn & Phòng VIP
          </a>
          <a href="/orders" onClick={event => follow(event, '/orders')}>
            Tra cứu Đơn của tôi
          </a>
        </nav>

        {/* Cột 3: Chính sách bán hàng & Cam kết An toàn VSTP */}
        <div
          className="sera-footer-policies"
          aria-label="Chính sách bán hàng và an toàn thực phẩm"
        >
          <h3>Chính sách & An toàn VSTP</h3>
          <button
            type="button"
            className="sera-footer-policy-btn"
            onClick={() => setActivePolicyId('food-safety')}
          >
            <ShieldCheck aria-hidden="true" />
            <span>Giấy chứng nhận An toàn VSTP (Hạng A)</span>
          </button>
          <button
            type="button"
            className="sera-footer-policy-btn"
            onClick={() => setActivePolicyId('refund-cancel')}
          >
            <RefreshCcw aria-hidden="true" />
            <span>Chính sách Hủy / Đổi món & Hoàn tiền</span>
          </button>
          <button
            type="button"
            className="sera-footer-policy-btn"
            onClick={() => setActivePolicyId('delivery-terms')}
          >
            <Truck aria-hidden="true" />
            <span>Chính sách Mang về & Giữ chỗ</span>
          </button>
          <button
            type="button"
            className="sera-footer-policy-btn"
            onClick={() => setActivePolicyId('privacy')}
          >
            <Lock aria-hidden="true" />
            <span>Chính sách Bảo vệ Dữ liệu Cá nhân</span>
          </button>

          <div className="sera-footer-attp-mini">
            <Award className="size-4 shrink-0 text-accent" />
            <div>
              <strong>GCN ATTP: ATTP-KH/2025/0842</strong>
              <small>Kiểm định nguyên liệu & lưu mẫu 24h mỗi ngày</small>
            </div>
          </div>
        </div>

        {/* Cột 4: Liên hệ & CSKH */}
        <div className="sera-footer-contact">
          <h3>Liên hệ & Hỗ trợ</h3>
          <p>
            <MapPin />
            <span>{fullAddress}</span>
          </p>
          <p>
            <Clock3 />
            <span>
              {restaurant
                ? `${restaurant.openingTime} – ${restaurant.closingTime}`
                : '07:00 – 23:00'}{' '}
              (Tất cả các ngày trong tuần)
            </span>
          </p>
          <p>
            <Phone />
            <span>
              Hotline đặt bàn & giao hàng:{' '}
              <a href={`tel:${phoneDisplay.replace(/\s+/g, '')}`}>
                <strong>{phoneDisplay}</strong>
              </a>
            </span>
          </p>
          <p>
            <Mail />
            <a href={`mailto:${emailDisplay}`}>{emailDisplay}</a>
          </p>

          <button
            type="button"
            className="sera-footer-cert-trigger"
            onClick={() => setActivePolicyId('food-safety')}
          >
            <FileCheck2 className="size-4 shrink-0" />
            <span>Xem hồ sơ An toàn Thực phẩm & Quy chuẩn bếp</span>
          </button>
        </div>
      </section>

      {/* 3. DẢI CHỨNG NHẬN PHÁP LÝ & AN TOÀN VỆ SINH THỰC PHẨM */}
      <section
        className="sera-footer-compliance"
        aria-label="Thông tin pháp lý và chứng nhận"
      >
        <div className="sera-compliance-badges">
          <button
            type="button"
            className="sera-compliance-pill"
            onClick={() => setActivePolicyId('food-safety')}
          >
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <strong>Đạt chuẩn An toàn Thực phẩm Hạng A</strong>
              <small>Sở Y tế & Chi cục ATVSTP Khánh Hòa cấp phép</small>
            </div>
          </button>

          <button
            type="button"
            className="sera-compliance-pill"
            onClick={() => setActivePolicyId('refund-cancel')}
          >
            <CheckCircle2 className="size-4 text-accent" />
            <div>
              <strong>Cam kết Đổi trả / Hoàn tiền 100%</strong>
              <small>Xử lý trong 15 phút nếu món nguội hoặc sai lệch</small>
            </div>
          </button>

          <button
            type="button"
            className="sera-compliance-pill"
            onClick={() => setActivePolicyId('privacy')}
          >
            <Lock className="size-4 text-accent" />
            <div>
              <strong>Đã thông báo Bộ Công Thương (TMĐT F&B)</strong>
              <small>Bảo mật dữ liệu theo Nghị định 13/2023/NĐ-CP</small>
            </div>
          </button>
        </div>

        <div className="sera-footer-legal-entity">
          <p>
            <strong>Đơn vị chủ quản:</strong> Công ty TNHH Ẩm Thực & Dịch Vụ
            Nhà Hàng {name} · <strong>Mã số doanh nghiệp:</strong> 4201987654 do
            Sở Kế hoạch & Đầu tư Tỉnh Khánh Hòa cấp.
          </p>
          <p>
            <strong>Trụ sở chính & Bếp trung tâm:</strong> {fullAddress} ·{' '}
            <strong>Giấy CN Cơ sở đủ điều kiện ATTP số:</strong>{' '}
            ATTP-KH/2025/0842.
          </p>
        </div>
      </section>

      <div className="sera-footer-bottom">
        <span>
          © {new Date().getFullYear()} {name} · Bản quyền nội dung & hình ảnh
          thuộc nhà hàng
        </span>
        <span>Ẩm thực Việt truyền thống · Nha Trang, Khánh Hòa</span>
      </div>

      {/* MODAL XEM CHI TIẾT CHÍNH SÁCH & GIẤY CHỨNG NHẬN ATTP */}
      {activePolicy ? (
        <div
          className="sera-policy-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="policy-modal-title"
          onClick={() => setActivePolicyId(null)}
        >
          <div
            className="sera-policy-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="sera-policy-modal-head">
              <div>
                <span className="sera-policy-modal-badge">
                  <ShieldCheck className="size-3.5" /> {activePolicy.badge}
                </span>
                <h2 id="policy-modal-title">{activePolicy.title}</h2>
                <p>{activePolicy.subtitle}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setActivePolicyId(null)}
                aria-label="Đóng cửa sổ chính sách"
              >
                <X />
              </Button>
            </div>

            <div className="sera-policy-modal-meta">
              <span>
                <strong>Mã văn bản / Chứng nhận:</strong>{' '}
                {activePolicy.codeLabel}
              </span>
              <span>
                <strong>Cơ quan / Đơn vị:</strong> {activePolicy.issuedBy}
              </span>
            </div>

            <div className="sera-policy-modal-tabs">
              {(Object.keys(POLICY_DOCUMENTS) as PolicyDocId[]).map(docId => (
                <button
                  key={docId}
                  type="button"
                  className={`sera-policy-tab-btn ${activePolicyId === docId ? 'is-active' : ''}`}
                  onClick={() => setActivePolicyId(docId)}
                >
                  {docId === 'food-safety' && 'An toàn VSTP'}
                  {docId === 'refund-cancel' && 'Đổi trả & Hoàn tiền'}
                  {docId === 'delivery-terms' && 'Giao hàng & Đặt bàn'}
                  {docId === 'privacy' && 'Bảo mật dữ liệu'}
                </button>
              ))}
            </div>

            <div className="sera-policy-modal-body">
              {activePolicy.sections.map(sec => (
                <section key={sec.heading} className="sera-policy-sec">
                  <h3>{sec.heading}</h3>
                  <ul>
                    {sec.items.map(bullet => (
                      <li key={bullet}>
                        <CheckCircle2 className="size-4 shrink-0 text-accent" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="sera-policy-modal-foot">
              <span className="text-xs text-muted-foreground">
                Cần hỗ trợ trực tiếp? Gọi Hotline{' '}
                <strong>{phoneDisplay}</strong> (07:00 – 23:00)
              </span>
              <Button type="button" onClick={() => setActivePolicyId(null)}>
                Đã hiểu & Đóng cửa sổ
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </footer>
  )
}
