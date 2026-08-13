# QuanLyNhaHang

Backend quản lý nhà hàng xây dựng bằng ASP.NET Core, Clean Architecture, CQRS, MediatR, Entity Framework Core và SQL Server.

## Tài liệu

- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [Chương 10 – Dependable systems](docs/DEPENDABLE_SYSTEMS.md)
- [Cấu hình local an toàn](docs/LOCAL_CONFIGURATION.md)
- [Website khách hàng độc lập](docs/CUSTOMER_WEBSITE.md)

## Chạy local

Dự án hỗ trợ một SQL Server Docker dùng chung cho Visual Studio, Docker API và SSMS.

1. Sao chép `.env.example` thành `.env` và điền cấu hình local.
2. Khởi động SQL Server:

```powershell
docker compose up -d database
```

3. Cấu hình connection string, JWT và SMTP bằng **Manage User Secrets** của project `QuanLyNhaHang.Api`.
4. Áp dụng migration khi chạy API bằng Visual Studio:

```powershell
Update-Database
```

5. Chạy `QuanLyNhaHang.Api` bằng Visual Studio.

Hướng dẫn đầy đủ và quy tắc bảo mật: [docs/LOCAL_CONFIGURATION.md](docs/LOCAL_CONFIGURATION.md).

## Chạy website khách hàng

Website khách hàng là project riêng, không nằm trong cổng quản trị:

```powershell
cd .\QuanLyNhaHang.CustomerWeb
Copy-Item .env.example .env.local
npm install
npm run dev
```

Mở `http://localhost:5174`. Cổng quản trị tiếp tục chạy riêng tại
`http://localhost:5173`. Xem cấu hình QR và CORS tại
[docs/CUSTOMER_WEBSITE.md](docs/CUSTOMER_WEBSITE.md).

## Chạy toàn bộ bằng Docker

```powershell
docker compose up --build -d
```

Docker Compose tự khởi động SQL Server, chờ database healthy, chạy migration còn thiếu và khởi động API.

## Kiểm tra trạng thái

```text
GET /health        # liveness tương thích
GET /health/live   # tiến trình API
GET /health/ready  # API và SQL Server sẵn sàng
```

## Kiểm thử

```powershell
dotnet test QuanLyNhaHang.UnitTests/QuanLyNhaHang.UnitTests.csproj
dotnet test QuanLyNhaHang.IntegrationTests/QuanLyNhaHang.IntegrationTests.csproj
```

## Sao lưu và khôi phục database Docker

Tạo file backup có checksum và tự chạy `RESTORE VERIFYONLY`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
```

Khôi phục một file `.bak` đã được kiểm tra:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-database.ps1 `
  -BackupFile D:\RestaurantBackups\QuanLyNhaHang-20260805-230000.bak
```

Quy trình, RPO/RTO và lưu ý vận hành nằm trong [docs/DEPENDABLE_SYSTEMS.md](docs/DEPENDABLE_SYSTEMS.md).

## Bảo mật cấu hình

Không commit các file sau:

- `.env` và biến thể local của `.env`;
- `appsettings.json`;
- `appsettings.Development.json`;
- connection string có mật khẩu;
- JWT secret, SMTP password hoặc API key.

Visual Studio sử dụng ASP.NET Core User Secrets; Docker Compose sử dụng `.env`.
