# Chạy QuanLyNhaHang bằng Docker

## Chuẩn bị

Cài Docker Desktop và bảo đảm lệnh `docker compose version` chạy được.

Tại thư mục gốc của repository, tạo file cấu hình local:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và thay mật khẩu SQL Server, JWT secret cùng thông tin SMTP. File
`.env` chứa bí mật và đã được Git bỏ qua; không commit hoặc gửi file này cho
người khác.

## Khởi động

```powershell
docker compose up --build -d
```

Compose sẽ:

1. Khởi động SQL Server 2022 Developer và lưu dữ liệu trong Docker volume.
2. Build API bằng .NET 10 rồi chạy container bằng user không phải `root`.
3. Chờ SQL Server sẵn sàng và tự áp dụng Entity Framework migrations.

Kiểm tra trạng thái và log:

```powershell
docker compose ps
docker compose logs -f api
```

Mặc định:

- Health check API: `http://localhost:8080/health`
- OpenAPI JSON: `http://localhost:8080/openapi/v1.json`
- SQL Server: `localhost,1433`

Có thể đổi cổng bằng `API_PORT` và `SQLSERVER_PORT` trong `.env`.

## Dừng hoặc đặt lại dữ liệu

Dừng container nhưng giữ database:

```powershell
docker compose down
```

Xóa container và toàn bộ database local trong Docker volume:

```powershell
docker compose down -v
```

Lệnh có `-v` xóa dữ liệu và không thể hoàn tác.

## Lưu ý triển khai

`Database__ApplyMigrationsOnStartup=true` chỉ được bật trong Compose local.
Khi triển khai production, hãy quản lý migration bằng một bước phát hành riêng
và lưu connection string, JWT secret, SMTP credentials trong secret manager của
nền tảng triển khai.
