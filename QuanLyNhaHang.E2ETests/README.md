# Playwright E2E

Bộ kiểm thử này mở Chromium và thao tác trực tiếp trên React frontend kết nối với ASP.NET Core API và SQL Server thật.

## Phạm vi hiện tại

- đăng nhập Admin
- mở các module Tài khoản & phân quyền, Khu vực & bàn và Thực đơn
- phát hiện lỗi JavaScript trong trình duyệt
- phát hiện request API thất bại hoặc HTTP 4xx/5xx
- kiểm tra giao diện desktop không tràn ngang
- tạo khu vực rồi xác nhận khu vực xuất hiện
- tạo bàn rồi xác nhận bàn xuất hiện đúng khu vực và sức chứa
- tạo danh mục rồi xác nhận danh mục xuất hiện
- tạo món ăn rồi xác nhận món xuất hiện đúng danh mục và giá
- giữ trace, screenshot và video khi test thất bại

## Chạy trên máy Windows

1. Tại thư mục gốc dự án, khởi động backend và database:

```powershell
docker compose up -d --build
```

2. Xác nhận API hoạt động:

```powershell
Invoke-WebRequest http://localhost:8080/health
```

3. Cung cấp tài khoản Admin đang hoạt động và đã xác minh email:

```powershell
$env:E2E_ADMIN_EMAIL="admin@example.com"
$env:E2E_ADMIN_PASSWORD="MatKhauAdmin"
$env:E2E_API_URL="http://localhost:8080"
$env:E2E_BASE_URL="http://localhost:5173"
```

Dùng thống nhất `localhost` để khớp với CORS mặc định của Docker. Không trộn `localhost:5173` và `127.0.0.1:5173` khi chạy trên máy nếu chưa đặt lại `FRONTEND_ORIGIN` cho API.

4. Cài và chạy Playwright:

```powershell
cd QuanLyNhaHang.E2ETests
npm install
npx playwright install chromium
npm test
```

Playwright tự khởi động Vite tại `http://localhost:5173`. Nếu frontend đã chạy sẵn đúng địa chỉ này, Playwright sẽ dùng lại server hiện tại.

## Chế độ quan sát trực tiếp

```powershell
npm run test:headed
```

Hoặc dùng giao diện Playwright:

```powershell
npm run test:ui
```

## Báo cáo

Sau khi chạy:

```powershell
npm run report
```

Khi GitHub Actions thất bại, artifact `playwright-report-*` chứa HTML report, trace, screenshot và video để tái hiện lỗi.

> Các bài test tạo dữ liệu có tên chứa `Playwright` và hậu tố thời gian để tránh trùng. Nên chạy trên database phát triển hoặc database kiểm thử, không chạy trên dữ liệu sản xuất.
