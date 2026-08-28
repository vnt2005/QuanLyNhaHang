# Cấu hình local an toàn

Tài liệu này chuẩn hóa cách chạy local để Docker, Visual Studio, Admin Web và CustomerWeb không còn dùng nhiều địa chỉ API khác nhau.

## Kiến trúc chuẩn

Browser và các script local chỉ dùng **một API public duy nhất**:

```text
http://localhost:8080
```

Luồng thực tế:

```text
Admin Web :5173 ─────┐
                     ├──> API Gateway :8080
CustomerWeb :5174 ───┘          │
                                ├── Visual Studio API :18080 (ưu tiên khi đang debug)
                                └── Docker API api:8080 (fallback tự động)
```

Cổng `18080` chỉ là cổng nội bộ debug để Docker Gateway kết nối tới Visual Studio. Không cấu hình frontend, SePay hoặc browser gọi trực tiếp cổng này.

SQL Server và Mailpit vẫn dùng chung:

```text
Visual Studio API  -- localhost,1433 --> SQL Server Docker
Docker API         -- database,1433  --> SQL Server Docker
SSMS               -- localhost,1433 --> SQL Server Docker

Visual Studio API  -- localhost:1025 --> Mailpit Docker
Docker API         -- mailpit:1025   --> Mailpit Docker
Browser            -- localhost:8025 --> Mailpit UI
```

## 1. Cấu hình Docker bằng `.env`

Tại thư mục gốc repository:

```powershell
Copy-Item .env.example .env
```

Sửa `.env` bằng giá trị local thật. Không commit file này.

Các giá trị URL/port chuẩn:

```dotenv
API_PORT=8080
FRONTEND_PORT=5173
CUSTOMER_FRONTEND_PORT=5174
BROWSER_API_BASE_URL=http://localhost:8080
SQLSERVER_PORT=1433
MAILPIT_WEB_PORT=8025
MAILPIT_SMTP_PORT=1025
FRONTEND_ORIGIN=http://localhost:5173
CUSTOMER_FRONTEND_ORIGIN=http://localhost:5174
```

Các secret như `MSSQL_SA_PASSWORD`, `JWT_SECRET_KEY`, SMTP credential, SePay key phải nằm trong `.env` local hoặc secret store, không commit Git.

## 2. Visual Studio User Secrets

Project `QuanLyNhaHang.Api` dùng User Secrets. Visual Studio API cần trỏ cùng database và dùng cùng JWT/SePay config với Docker nếu muốn chuyển qua lại mượt giữa hai backend.

Ví dụ:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=QuanLyNhaHang;User Id=sa;Password=<same-password-as-env>;Encrypt=True;TrustServerCertificate=True"
  },
  "Jwt": {
    "SecretKey": "<same-jwt-secret-as-env>",
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
  }
}
```

Không chia sẻ output `dotnet user-secrets list` vì có thể chứa bí mật.

## 3. Chạy toàn bộ bằng Docker

```powershell
docker compose up -d --build
```

Sau khi chạy:

- Admin Web: `http://localhost:5173`
- CustomerWeb: `http://localhost:5174`
- API dùng chung: `http://localhost:8080`
- Mailpit: `http://localhost:8025`

Docker API không chiếm trực tiếp cổng host 8080 nữa; cổng này thuộc về API Gateway.

## 4. Debug API bằng Visual Studio trong khi Docker vẫn chạy

Không cần stop Docker API.

Giữ Docker stack chạy rồi bấm Run/F5 `QuanLyNhaHang.Api` trong Visual Studio. Launch profile sẽ bind API debug tại:

```text
http://0.0.0.0:18080
```

Gateway ở `localhost:8080` tự ưu tiên Visual Studio API khi nó sẵn sàng. Khi bạn stop debug, gateway tự fallback về Docker API.

Frontend và SePay tunnel vẫn luôn dùng:

```text
http://localhost:8080
```

Do đó không cần đổi `.env`, không cần đổi URL và không còn lỗi hai tiến trình cùng bind cổng 8080.

## 5. Chạy frontend bằng npm run dev

Nếu muốn hot reload giao diện, dừng riêng frontend Docker:

```powershell
docker compose stop admin-web customer-web
```

Sau đó chạy hai terminal:

```powershell
cd QuanLyNhaHang.Frontend
npm run dev
```

```powershell
cd QuanLyNhaHang.CustomerWeb
npm run dev
```

Cả hai vẫn gọi `http://localhost:8080`.

Quay lại frontend Docker:

```powershell
docker compose up -d --build admin-web customer-web
```

## 6. SePay / Cloudflare tunnel

Script webhook dùng API Gateway mặc định:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-sepay-webhook-tunnel.ps1
```

Không cần phân biệt backend đang là Visual Studio hay Docker; tunnel luôn trỏ vào `http://localhost:8080` và Gateway quyết định backend đang phục vụ request.

Giữ cửa sổ tunnel mở trong suốt lúc nhận thanh toán. Quick Tunnel đổi URL sau mỗi lần chạy nên cần cập nhật URL mới trên SePay.

## 7. Kiểm tra trạng thái

```powershell
docker compose ps
docker compose logs -f api-gateway
docker compose logs -f api
```

API health dùng chung:

```text
http://localhost:8080/health/live
http://localhost:8080/health/ready
```

## 8. Giữ dữ liệu local

Dừng container nhưng giữ database:

```powershell
docker compose down
```

Không dùng `docker compose down -v` nếu muốn giữ dữ liệu vì `-v` xóa Docker volume.
