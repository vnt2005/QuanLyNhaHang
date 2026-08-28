# Chạy QuanLyNhaHang bằng Docker

## Chuẩn bị

Cài Docker Desktop và bảo đảm lệnh `docker compose version` chạy được.

Tại thư mục gốc của repository, tạo file cấu hình local:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và thay mật khẩu SQL Server, JWT secret cùng thông tin SMTP/SePay cần dùng. File `.env` chứa bí mật và đã được Git bỏ qua; không commit hoặc gửi file này cho người khác.

## Cách nhanh nhất trên Windows: double-click

Repository có sẵn hai file ở thư mục gốc:

- `start-docker.bat`
- `start-docker.ps1`

Chỉ cần **double-click `start-docker.bat`**. Script sẽ:

1. Kiểm tra Docker Engine.
2. Nếu Docker Desktop chưa chạy và được cài ở vị trí mặc định, tự mở Docker Desktop rồi chờ engine sẵn sàng.
3. Chạy `docker compose up -d --build`.
4. Chờ API, Web App Admin và CustomerWeb phản hồi HTTP.
5. Tự mở Web App Admin và CustomerWeb bằng trình duyệt mặc định của Windows.

Nếu khởi động thất bại, cửa sổ `.bat` sẽ giữ lại để đọc lỗi thay vì tự đóng ngay.

Có thể chạy PowerShell trực tiếp nếu muốn chọn trình duyệt:

```powershell
.\start-docker.ps1
.\start-docker.ps1 -Browser Chrome
.\start-docker.ps1 -Browser Edge
```

Mặc định `start-docker.bat` dùng trình duyệt mặc định của Windows, nên nếu Chrome hoặc Edge đang là mặc định thì website sẽ tự mở bằng trình duyệt đó.

## Khởi động toàn bộ hệ thống bằng lệnh Compose

Nếu không muốn dùng script:

```powershell
docker compose up -d --build
```

Compose sẽ khởi động toàn bộ local stack:

1. SQL Server 2022 Developer và giữ dữ liệu trong Docker volume.
2. Mailpit để nhận email local.
3. API .NET và tự áp dụng Entity Framework migrations local.
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

Hoặc sau khi cập nhật code chỉ cần double-click lại `start-docker.bat`; script sẽ build lại image cần thiết rồi mở hai website.

## Đổi cổng local

Các giá trị mặc định nằm trong `.env.example`:

```text
API_PORT=8080
FRONTEND_PORT=5173
CUSTOMER_FRONTEND_PORT=5174
BROWSER_API_BASE_URL=http://localhost:8080
FRONTEND_ORIGIN=http://localhost:5173
CUSTOMER_FRONTEND_ORIGIN=http://localhost:5174
```

Nếu đổi cổng API hoặc frontend, hãy đổi đồng bộ `BROWSER_API_BASE_URL` và các `*_ORIGIN` để browser và CORS dùng cùng địa chỉ. `start-docker.ps1` tự đọc `API_PORT`, `FRONTEND_PORT` và `CUSTOMER_FRONTEND_PORT` trong `.env` để mở đúng cổng.

## Dừng hệ thống nhưng giữ dữ liệu

```powershell
docker compose down
```

Lệnh trên dừng/xóa container nhưng **không xóa Docker volume SQL Server**, nên database local vẫn được giữ.

## Lưu ý triển khai

Hai frontend trong Compose local được build thành static assets và serve bằng Nginx. Các biến `VITE_*` được truyền vào lúc Docker build, vì vậy khi đổi `BROWSER_API_BASE_URL` hoặc URL CustomerWeb cần chạy lại `docker compose up -d --build`.

`Database__ApplyMigrationsOnStartup=true` chỉ được bật trong Compose local. Khi triển khai production, hãy quản lý migration bằng một bước phát hành riêng và lưu connection string, JWT secret, SMTP credentials trong secret manager của nền tảng triển khai.
