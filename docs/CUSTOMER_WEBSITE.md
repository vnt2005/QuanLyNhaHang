# Website khách hàng

`QuanLyNhaHang.CustomerWeb` là website độc lập dành cho khách hàng. Website
không nằm trong giao diện quản trị và không yêu cầu khách mở
`QuanLyNhaHang.Frontend`.

## Phân tách ứng dụng

| Thành phần | Địa chỉ local mặc định | Người dùng |
| --- | --- | --- |
| `QuanLyNhaHang.Frontend` | `http://localhost:5173` | Nhân viên, quản lý |
| `QuanLyNhaHang.CustomerWeb` | `http://localhost:5174` | Khách hàng |
| `QuanLyNhaHang.Api` | `https://localhost:7134` | Dùng chung cho hai website |

Website khách hàng có trang chủ, thực đơn công khai, đặt bàn, đăng ký/đăng
nhập, lịch sử đơn và trang gọi món theo QR. QR chỉ là một đường dẫn trực tiếp
đến `/qr-order/{token}` trên website khách hàng; khách vẫn có thể vào trang
chủ mà không cần quét QR.

## Chạy local

Khởi động API trước, sau đó mở một PowerShell mới tại thư mục repository:

```powershell
cd .\QuanLyNhaHang.CustomerWeb
Copy-Item .env.example .env.local
npm install
npm run dev
```

Mở `http://localhost:5174`.

File `.env.local` không được commit. Cấu hình mặc định:

```dotenv
VITE_API_BASE_URL=https://localhost:7134
```

Khi chạy API bằng Visual Studio, thêm cả hai origin vào User Secrets:

```json
{
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:5174"
    ]
  }
}
```

Khi chạy API bằng Docker Compose, đặt hai biến trong `.env` ở thư mục gốc:

```dotenv
FRONTEND_ORIGIN=http://localhost:5173
CUSTOMER_FRONTEND_ORIGIN=http://localhost:5174
```

## Cấu hình QR từ cổng quản trị

Trong `QuanLyNhaHang.Frontend/.env.local`, đặt địa chỉ website khách hàng:

```dotenv
VITE_API_BASE_URL=https://localhost:7134
VITE_CUSTOMER_APP_URL=http://localhost:5174
```

Mã QR mới sẽ trỏ đến website khách hàng. Các liên kết QR cũ còn trỏ vào cổng
quản trị được chuyển tiếp sang website khách hàng, nhưng nên tạo lại hoặc in
lại QR sau khi cấu hình domain chính thức.

## Build production

```powershell
cd .\QuanLyNhaHang.CustomerWeb
npm ci
npm run build
```

Thư mục đầu ra là `dist`. Máy chủ static phải cấu hình SPA fallback: mọi đường
dẫn như `/menu`, `/reservation`, `/orders` và `/qr-order/{token}` cần trả về
`index.html`. Đồng thời, cấu hình domain production của website khách hàng
trong CORS của API và trong `VITE_CUSTOMER_APP_URL` của cổng quản trị.

Mobile app là một ứng dụng riêng trong giai đoạn sau; website này được thiết
kế desktop-first và tự co giãn để khách vẫn dùng tốt trên điện thoại.
