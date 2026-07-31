# QuanLyNhaHang

Backend quản lý nhà hàng xây dựng bằng ASP.NET Core, Clean Architecture, CQRS, MediatR, Entity Framework Core và SQL Server.

## Tài liệu

- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [Cấu hình local an toàn](docs/LOCAL_CONFIGURATION.md)

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

## Chạy toàn bộ bằng Docker

```powershell
docker compose up --build -d
```

Docker Compose tự khởi động SQL Server, chờ database healthy, chạy migration còn thiếu và khởi động API.

## Kiểm thử

```powershell
dotnet test QuanLyNhaHang.UnitTests/QuanLyNhaHang.UnitTests.csproj
dotnet test QuanLyNhaHang.IntegrationTests/QuanLyNhaHang.IntegrationTests.csproj
```

## Bảo mật cấu hình

Không commit các file sau:

- `.env` và biến thể local của `.env`;
- `appsettings.json`;
- `appsettings.Development.json`;
- connection string có mật khẩu;
- JWT secret, SMTP password hoặc API key.

Visual Studio sử dụng ASP.NET Core User Secrets; Docker Compose sử dụng `.env`.
