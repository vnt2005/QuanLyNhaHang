# Cấu hình local an toàn

Tài liệu này chuẩn hóa cách chạy dự án với một SQL Server Docker dùng chung cho:

- API chạy trong Visual Studio;
- API chạy bằng Docker Compose;
- SQL Server Management Studio (SSMS).

Không lưu mật khẩu, JWT secret hoặc SMTP credential trong repository.

## Kiến trúc local

```text
Visual Studio API  -- localhost,1433 --> SQL Server Docker
Docker API         -- database,1433  --> SQL Server Docker
SSMS               -- localhost,1433 --> SQL Server Docker
```

`localhost,1433` và `database,1433` là hai địa chỉ truy cập khác nhau nhưng cùng trỏ tới service `database` trong Docker Compose.

## 1. Cấu hình Docker Compose bằng `.env`

Tại thư mục gốc repository:

```powershell
Copy-Item .env.example .env
```

Sửa `.env` bằng các giá trị local thật. Không commit file này.

```dotenv
API_PORT=8080
SQLSERVER_PORT=1433
FRONTEND_ORIGIN=http://localhost:5173
MSSQL_SA_PASSWORD=<strong-local-password>
JWT_SECRET_KEY=<long-random-secret-at-least-32-bytes>
JWT_ISSUER=QuanLyNhaHang
JWT_AUDIENCE=QuanLyNhaHang.Client
JWT_EXPIRES_IN_MINUTES=60
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_USERNAME=<smtp-account>
EMAIL_PASSWORD=<smtp-app-password>
EMAIL_FROM=<sender-address>
```

Khởi động riêng SQL Server Docker khi phát triển bằng Visual Studio:

```powershell
docker compose up -d database
docker compose ps
```

Không dùng `docker compose down -v` nếu cần giữ dữ liệu, vì tùy chọn `-v` xóa volume SQL Server.

## 2. Cấu hình Visual Studio bằng User Secrets

Project `QuanLyNhaHang.Api` đã có `UserSecretsId`.

Trong Visual Studio:

1. Nhấp chuột phải `QuanLyNhaHang.Api`.
2. Chọn **Manage User Secrets**.
3. Thay nội dung bằng mẫu sau và điền giá trị local thật.

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=QuanLyNhaHang;User Id=sa;Password=<strong-local-password>;Encrypt=True;TrustServerCertificate=True"
  },
  "Jwt": {
    "SecretKey": "<long-random-secret-at-least-32-bytes>",
    "Issuer": "QuanLyNhaHang",
    "Audience": "QuanLyNhaHang.Client",
    "ExpiresInMinutes": "60"
  },
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:5173"
    ]
  },
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": "587",
    "Username": "<smtp-account>",
    "Password": "<smtp-app-password>",
    "From": "<sender-address>"
  }
}
```

User Secrets chỉ dành cho phát triển local. File secrets nằm ngoài repository và không được Git theo dõi.

Factory design-time của EF Core dùng cùng `UserSecretsId` với project `QuanLyNhaHang.Api`. Vì vậy `Update-Database` trong Package Manager Console sẽ đọc `ConnectionStrings:DefaultConnection` từ User Secrets này, kể cả khi **Default project** là `QuanLyNhaHang.Infrastructure`.

Có thể cấu hình bằng CLI thay cho giao diện Visual Studio:

```powershell
dotnet user-secrets set --project QuanLyNhaHang.Api "ConnectionStrings:DefaultConnection" "Server=localhost,1433;Database=QuanLyNhaHang;User Id=sa;Password=<strong-local-password>;Encrypt=True;TrustServerCertificate=True"
dotnet user-secrets set --project QuanLyNhaHang.Api "Jwt:SecretKey" "<long-random-secret-at-least-32-bytes>"
dotnet user-secrets set --project QuanLyNhaHang.Api "Jwt:Issuer" "QuanLyNhaHang"
dotnet user-secrets set --project QuanLyNhaHang.Api "Jwt:Audience" "QuanLyNhaHang.Client"
dotnet user-secrets set --project QuanLyNhaHang.Api "Jwt:ExpiresInMinutes" "60"
dotnet user-secrets set --project QuanLyNhaHang.Api "Cors:AllowedOrigins:0" "http://localhost:5173"
```

Khi chạy môi trường `Development` mà chưa cấu hình mục `Cors`, API mặc định chỉ cho phép frontend tại `http://localhost:5173` và `https://localhost:5173`. Môi trường khác phải khai báo rõ từng origin; không sử dụng wildcard `*`.

Không chụp màn hình hoặc chia sẻ kết quả `dotnet user-secrets list`, vì lệnh đó hiển thị giá trị bí mật.

## 3. Dọn `appsettings.Development.json` local

Các file `appsettings*.json` được Git bỏ qua, vì vậy pull code không tự sửa file local đang chứa bí mật.

Xóa khỏi `appsettings.Development.json` các mục:

- `ConnectionStrings` có mật khẩu;
- `Jwt:SecretKey`;
- `Email:Username`;
- `Email:Password`;
- mọi API key hoặc credential khác.

Có thể giữ lại các cài đặt không bí mật, ví dụ:

```json
{
  "Database": {
    "ApplyMigrationsOnStartup": false,
    "SyncPermissionCatalogOnStartup": true,
    "SyncSystemRolesOnStartup": true
  }
}
```

Khi chạy Visual Studio, dùng `Update-Database` để áp dụng migration vào SQL Server Docker tại `localhost,1433`.

## 4. Chạy toàn bộ bằng Docker Compose

Dừng API Visual Studio trước, sau đó chạy:

```powershell
docker compose up --build -d
```

Docker API dùng `Server=database,1433`; Visual Studio và SSMS dùng `Server=localhost,1433`. Cả hai đều truy cập cùng database `QuanLyNhaHang`.

Docker Compose đang bật tự động migration cho API container. EF Core chỉ áp dụng migration chưa có trong `__EFMigrationsHistory`.

## 5. Kiểm tra đúng database

Trong SSMS, kết nối:

```text
Server: localhost,1433
Authentication: SQL Server Authentication
Login: sa
Password: giá trị MSSQL_SA_PASSWORD trong .env
Trust Server Certificate: bật
```

Kiểm tra migration gần nhất:

```sql
SELECT MigrationId
FROM dbo.__EFMigrationsHistory
ORDER BY MigrationId;
```

Kiểm tra phiên đăng nhập:

```sql
SELECT *
FROM dbo.AuthSessions
ORDER BY CreatedAt DESC;
```

## 6. Xoay bí mật đã từng hiển thị

Nếu một bí mật đã xuất hiện trong ảnh, video, log hoặc tin nhắn, coi bí mật đó là đã lộ và tạo giá trị mới:

- Gmail App Password;
- JWT secret;
- mật khẩu tài khoản `sa`;
- API key khác nếu có.

Sau khi xoay, cập nhật đồng thời `.env` và User Secrets. Không đưa giá trị mới vào `appsettings*.json` hoặc commit Git.
