# Cấu hình local an toàn

Tài liệu này chuẩn hóa cách chạy dự án với SQL Server và Mailpit dùng chung cho:

- API chạy trong Visual Studio;
- cổng quản trị chạy tại `http://localhost:5173`;
- website khách hàng chạy tại `http://localhost:5174`;
- API chạy bằng Docker Compose;
- SQL Server Management Studio (SSMS);
- các luồng email xác minh, 2FA và đặt lại mật khẩu.

Không lưu mật khẩu, JWT secret hoặc SMTP credential trong repository.

## Kiến trúc local

```text
Visual Studio API  -- localhost,1433 --> SQL Server Docker
Docker API         -- database,1433  --> SQL Server Docker
SSMS               -- localhost,1433 --> SQL Server Docker

Visual Studio API  -- localhost:1025 --> Mailpit Docker
Docker API         -- mailpit:1025   --> Mailpit Docker
Browser            -- localhost:8025 --> Hộp thư Mailpit
```

`localhost,1433` và `database,1433` là hai địa chỉ truy cập khác nhau nhưng cùng
trỏ tới service `database`. Tương tự, `localhost:1025` và `mailpit:1025` cùng
trỏ tới SMTP local của Mailpit.

## 1. Cấu hình Docker Compose bằng `.env`

Tại thư mục gốc repository:

```powershell
Copy-Item .env.example .env
```

Sửa `.env` bằng các giá trị local thật. Không commit file này.

```dotenv
API_PORT=8080
SQLSERVER_PORT=1433
MAILPIT_WEB_PORT=8025
MAILPIT_SMTP_PORT=1025
FRONTEND_ORIGIN=http://localhost:5173
CUSTOMER_FRONTEND_ORIGIN=http://localhost:5174
MSSQL_SA_PASSWORD=<strong-local-password>
JWT_SECRET_KEY=<long-random-secret-at-least-32-bytes>
JWT_ISSUER=QuanLyNhaHang
JWT_AUDIENCE=QuanLyNhaHang.Client
JWT_EXPIRES_IN_MINUTES=60
EMAIL_SMTP_HOST=mailpit
EMAIL_SMTP_PORT=1025
EMAIL_ENABLE_SSL=false
EMAIL_USE_AUTHENTICATION=false
EMAIL_USERNAME=
EMAIL_PASSWORD=
EMAIL_FROM=noreply@quanlynhahang.local
SEPAY_BANK_CODE=TPBank
SEPAY_ACCOUNT_NUMBER=<tpbank-account-number>
SEPAY_ACCOUNT_HOLDER=<account-holder-without-diacritics>
SEPAY_WEBHOOK_API_KEY=<same-api-key-configured-in-sepay>
SEPAY_PAYMENT_PREFIX=DH
SEPAY_REQUIRE_WEBHOOK_READINESS=true
SEPAY_WEBHOOK_HEARTBEAT_TIMEOUT_SECONDS=35
```

Khởi động SQL Server và hộp thư local khi phát triển bằng Visual Studio:

```powershell
docker compose up -d database mailpit
docker compose ps
```

Mở `http://localhost:8025` để xem tất cả email xác minh, mã 2FA và mã đặt lại
mật khẩu. Mailpit chỉ giữ email trong môi trường local và không gửi email thật
ra Internet.

Không dùng `docker compose down -v` nếu cần giữ dữ liệu, vì tùy chọn `-v` xóa
cả volume SQL Server và hộp thư Mailpit.

## 2. Cấu hình Visual Studio bằng User Secrets

Project `QuanLyNhaHang.Api` đã có `UserSecretsId`.

Trong Visual Studio:

1. Nhấp chuột phải `QuanLyNhaHang.Api`.
2. Chọn **Manage User Secrets**.
3. Giữ lại cấu hình database/JWT hiện có và đặt mục `Email`, `SePay` như sau.

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
      "http://localhost:5173",
      "http://localhost:5174"
    ]
  },
  "Email": {
    "SmtpHost": "localhost",
    "SmtpPort": "1025",
    "EnableSsl": "false",
    "UseAuthentication": "false",
    "From": "noreply@quanlynhahang.local"
  },
  "SePay": {
    "BankCode": "TPBank",
    "AccountNumber": "<tpbank-account-number>",
    "AccountHolder": "<account-holder-without-diacritics>",
    "WebhookApiKey": "<same-api-key-configured-in-sepay>",
    "PaymentPrefix": "DH",
    "RequireWebhookReadiness": true,
    "WebhookHeartbeatTimeoutSeconds": 35
  }
}
```

Với Mailpit, không khai báo `Email:Username` hoặc `Email:Password`. User Secrets
chỉ dành cho phát triển local, nằm ngoài repository và không được Git theo dõi.

Factory design-time của EF Core dùng cùng `UserSecretsId` với project
`QuanLyNhaHang.Api`. Vì vậy `Update-Database` trong Package Manager Console sẽ
đọc `ConnectionStrings:DefaultConnection` từ User Secrets này, kể cả khi
**Default project** là `QuanLyNhaHang.Infrastructure`.

Khi chạy môi trường `Development` mà chưa cấu hình mục `Cors`, API mặc định
cho phép cổng quản trị ở cổng `5173` và website khách hàng ở cổng `5174`, với
cả hai giao thức HTTP/HTTPS.
Môi trường khác phải khai báo rõ từng origin; không sử dụng wildcard `*`.

Không chụp màn hình hoặc chia sẻ kết quả `dotnet user-secrets list`, vì lệnh đó
hiển thị giá trị bí mật.

## 3. Kiểm thử Auth bằng Mailpit

1. Chạy `docker compose up -d database mailpit`.
2. Khởi động `QuanLyNhaHang.Api` bằng Visual Studio.
3. Mở website cần kiểm thử: cổng quản trị tại `http://localhost:5173` hoặc website khách hàng tại `http://localhost:5174`.
4. Mở hộp thư tại `http://localhost:8025`.
5. Đăng nhập tài khoản bật 2FA.
6. Mở email mới trong Mailpit và nhập mã 6 chữ số vào frontend.

Khi bật 2FA, backend gửi email kiểm tra trước. Chỉ khi gửi thành công backend
mới lưu `TwoFactorEnabled = true`. Vì vậy cấu hình SMTP lỗi sẽ không khóa tài
khoản ở lần đăng nhập tiếp theo.

Nếu SMTP không dùng được, API trả `503 Service Unavailable` cùng thông báo an
toàn; chi tiết kỹ thuật chỉ nằm trong log backend và mã OTP không bị ghi ra log.

## 4. Dùng SMTP thật ngoài môi trường local

Mailpit chỉ phục vụ phát triển. Khi triển khai thật, dùng SMTP provider và cấu
hình qua secret của môi trường:

```dotenv
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_ENABLE_SSL=true
EMAIL_USE_AUTHENTICATION=true
EMAIL_USERNAME=<smtp-account>
EMAIL_PASSWORD=<smtp-app-password>
EMAIL_FROM=<sender-address>
```

Không đặt SMTP credential trong `appsettings*.json`, source code hoặc Git.

## 5. Dọn `appsettings.Development.json` local

Các file `appsettings*.json` được Git bỏ qua, vì vậy pull code không tự sửa file
local đang chứa bí mật.

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

Khi chạy Visual Studio, dùng `Update-Database` để áp dụng migration vào SQL
Server Docker tại `localhost,1433`.

## 6. Chạy toàn bộ bằng Docker Compose

Dừng API Visual Studio trước, sau đó chạy:

```powershell
docker compose up --build -d
```

Docker API dùng `Server=database,1433`; Visual Studio và SSMS dùng
`Server=localhost,1433`. Cả hai đều truy cập cùng database `QuanLyNhaHang`.
Docker API dùng `mailpit:1025`, còn Visual Studio API dùng `localhost:1025`.

Docker Compose đang bật tự động migration cho API container. EF Core chỉ áp
dụng migration chưa có trong `__EFMigrationsHistory`.

## 7. Mở webhook SePay từ máy local

Cloudflare Quick Tunnel chỉ chuyển tiếp tới API đang chạy. Dự án còn dùng một
heartbeat có xác thực đi xuyên qua chính URL công khai. Khi heartbeat quá hạn,
backend trả `503 SEPAY_WEBHOOK_UNAVAILABLE`, nút thanh toán bị khóa và QR đang
mở được ẩn đi. Cơ chế này tránh cấp QR mới khi SePay không thể gọi về máy local.

Không chạy lệnh `cloudflared tunnel --url ...` riêng lẻ cho luồng thanh toán,
vì lệnh đó không gửi heartbeat readiness. Hãy dùng script của dự án.

Khi chạy API bằng Visual Studio tại `https://localhost:7134`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-sepay-webhook-tunnel.ps1
```

Khi chạy API bằng Docker Compose tại `http://localhost:8080`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-sepay-webhook-tunnel.ps1 -ApiBaseUrl http://localhost:8080
```

Script tự kiểm tra `/health/live`, tạo Quick Tunnel và lấy URL
`https://<ten-tunnel>.trycloudflare.com`. Script sẽ in URL webhook nhưng vẫn giữ
thanh toán ở trạng thái khóa. Hãy sao chép URL đó vào webhook **Có tiền vào**
của SePay, bấm lưu rồi nhập `OK` trong PowerShell. Chỉ sau khi heartbeat công
khai thành công và dòng **Kênh webhook đã sẵn sàng; thanh toán QR đã được mở**
hiện ra thì khách mới có thể lấy QR. Sau đó script gửi heartbeat mỗi 10 giây.

Giữ cửa sổ PowerShell này mở trong suốt lúc nhận thanh toán. Khi đóng cửa sổ,
heartbeat hết hạn sau tối đa khoảng 35 giây và ứng dụng tự khóa QR. Quick Tunnel
tạo URL tạm; nếu chạy lại script và URL thay đổi thì phải cập nhật URL mới trong
SePay trước khi cho khách thanh toán.

Không đưa `SEPAY_WEBHOOK_API_KEY` vào URL. Script đọc khóa từ file `.env`
không được theo dõi bởi Git; SePay gửi cùng khóa qua header
`Authorization: Apikey ...`.

Lưu ý giới hạn kỹ thuật: QR VietQR là lệnh chuyển khoản trực tiếp vào tài khoản
ngân hàng. Sau khi khách đã nhìn thấy hoặc chụp lại QR, ứng dụng không thể yêu
cầu ngân hàng từ chối khoản chuyển chỉ vì tunnel đã dừng. Readiness gate ngăn
tạo/hiển thị QR khi webhook mất kết nối; giao dịch thực tế vẫn chỉ được ghi nhận
thành công sau khi backend nhận và xác minh webhook SePay.

## 8. Kiểm tra đúng database

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

## 9. Xoay bí mật đã từng hiển thị

Nếu một bí mật đã xuất hiện trong ảnh, video, log hoặc tin nhắn, coi bí mật đó
là đã lộ và tạo giá trị mới:

- Gmail App Password;
- JWT secret;
- mật khẩu tài khoản `sa`;
- API key khác nếu có.

Sau khi xoay, cập nhật đồng thời `.env` và User Secrets. Không đưa giá trị mới
vào `appsettings*.json` hoặc commit Git.
