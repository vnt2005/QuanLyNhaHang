# Chạy QuanLyNhaHang bằng Docker

## Chuẩn bị

Cài Docker Desktop và bảo đảm lệnh `docker compose version` chạy được.

Tại thư mục gốc của repository, tạo file cấu hình local:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và thay mật khẩu SQL Server, JWT secret cùng thông tin SMTP/SePay cần dùng. File `.env` chứa bí mật và đã được Git bỏ qua; không commit hoặc gửi file này cho người khác.

## Một API local duy nhất

Toàn bộ project dùng chung một địa chỉ API local:

```text
http://localhost:8080
```

Web App Admin, CustomerWeb, Docker Compose, Visual Studio debug và test local đều dùng cổng 8080. Không còn dùng 7134/5240 cho luồng local thông thường.

Chỉ một tiến trình API được phép chiếm cổng 8080 tại một thời điểm:

- dùng API trong Docker, hoặc
- dừng API Docker rồi chạy API bằng Visual Studio để debug.

Frontend không cần đổi cấu hình khi chuyển giữa hai cách này vì URL API vẫn là `http://localhost:8080`.

## Khởi động toàn bộ hệ thống

```powershell
docker compose up -d --build
```

Compose sẽ khởi động toàn bộ local stack:

1. SQL Server 2022 Developer và giữ dữ liệu trong Docker volume.
2. Mailpit để nhận email local.
3. API .NET tại `http://localhost:8080`.
4. Web App Admin, build bằng Vite và serve qua Nginx.
5. CustomerWeb, build bằng Vite và serve qua Nginx.

Sau khi các container chạy:

- Web App Admin: `http://localhost:5173`
- Website khách hàng: `http://localhost:5174`
- API health: `http://localhost:8080/health`
- OpenAPI JSON: `http://localhost:8080/openapi/v1.json`
- Mailpit: `http://localhost:8025`
- SQL Server: `localhost,1433`

Không cần chạy `npm run dev` riêng cho hai frontend khi dùng Docker Compose theo cách này.

## Chạy frontend bằng npm run dev nhưng vẫn dùng API Docker

Giữ `database`, `mailpit`, `api` trong Docker và dừng hai frontend Docker để giải phóng cổng 5173/5174:

```powershell
docker compose stop admin-web customer-web
```

Sau đó chạy hai frontend bằng Vite. Cả hai vẫn gọi chung API `http://localhost:8080`:

```powershell
cd QuanLyNhaHang.Frontend
npm run dev
```

và ở terminal khác:

```powershell
cd QuanLyNhaHang.CustomerWeb
npm run dev
```

## Debug API bằng Visual Studio nhưng vẫn dùng cùng URL 8080

Nếu toàn bộ stack Docker đang chạy, dừng riêng API Docker trước:

```powershell
docker compose stop api
```

Sau đó chạy `QuanLyNhaHang.Api` bằng Visual Studio. Launch profile đã được chuẩn hóa để lắng nghe tại:

```text
http://localhost:8080
```

Admin Web và CustomerWeb vẫn gọi đúng URL này nên không cần đổi `.env` hay sửa code.

Khi debug xong, dừng Visual Studio API rồi bật API Docker lại:

```powershell
docker compose start api
```

Không chạy API Docker và Visual Studio API đồng thời vì cả hai cùng dùng cổng 8080.

## Kiểm tra trạng thái và log

```powershell
docker compose ps
docker compose logs -f api
docker compose logs -f admin-web
docker compose logs -f customer-web
```

Nếu vừa cập nhật code từ GitHub, chỉ cần chạy lại:

```powershell
git pull --ff-only origin main
docker compose up -d --build
```

Docker sẽ build lại các image bị thay đổi rồi chạy phiên bản mới.

## Đổi cổng local

Project hiện chuẩn hóa local development ở cổng 8080 để tránh nhiều URL API gây nhầm lẫn. Chỉ nên đổi cổng nếu có lý do cụ thể và phải đổi đồng bộ toàn bộ cấu hình liên quan.

Các giá trị mặc định nằm trong `.env.example`:

```text
API_PORT=8080
FRONTEND_PORT=5173
CUSTOMER_FRONTEND_PORT=5174
BROWSER_API_BASE_URL=http://localhost:8080
FRONTEND_ORIGIN=http://localhost:5173
CUSTOMER_FRONTEND_ORIGIN=http://localhost:5174
```

## Dừng hệ thống nhưng giữ dữ liệu

```powershell
docker compose down
```

Lệnh trên dừng/xóa container nhưng **không xóa Docker volume SQL Server**, nên database local vẫn được giữ.

## Lưu ý triển khai

Hai frontend trong Compose local được build thành static assets và serve bằng Nginx. Các biến `VITE_*` được truyền vào lúc Docker build, vì vậy khi đổi `BROWSER_API_BASE_URL` hoặc URL CustomerWeb cần chạy lại `docker compose up -d --build`.

`Database__ApplyMigrationsOnStartup=true` chỉ được bật trong Compose local. Khi triển khai production, hãy quản lý migration bằng một bước phát hành riêng và lưu connection string, JWT secret, SMTP credentials trong secret manager của nền tảng triển khai.
