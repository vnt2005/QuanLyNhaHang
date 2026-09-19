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

SePay hiện kiểm tra DNS của URL webhook và không chấp nhận URL Quick Tunnel `*.trycloudflare.com` trong cấu hình hiện tại. Local workflow dùng một Cloudflare Worker trên hostname miễn phí `workers.dev` làm public endpoint ổn định.

Luồng thực tế:

~~~text
SePay
  ↓
https://quanlynhahang-sepay-webhook.<account>.workers.dev
  ↓
Cloudflare Worker
  ↓
https://<random>.trycloudflare.com
  ↓
http://localhost:8080
  ↓
API
~~~

### Lần đầu

Đăng nhập Wrangler một lần:

~~~powershell
npx wrangler@latest login
~~~

Sau khi đăng nhập, cần đăng ký `workers.dev` subdomain cho tài khoản Cloudflare một lần. Trong Cloudflare Dashboard vào **Workers & Pages** và chọn **Your subdomain -> Change**, rồi chọn một subdomain miễn phí. Cloudflare dùng subdomain này làm phần `<YOUR_SUBDOMAIN>.workers.dev` của URL Worker.

Đây là bước riêng với `wrangler login`: đăng nhập thành công không đồng nghĩa `workers.dev` subdomain đã được đăng ký. Không cần mua domain riêng.

### Chạy webhook

~~~powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-sepay-webhook-tunnel.ps1
~~~

Script sẽ:

1. Kiểm tra API Gateway `http://localhost:8080`.
2. Tạo Quick Tunnel tới API local.
3. Deploy Worker `quanlynhahang-sepay-webhook` và truyền Quick Tunnel hiện tại vào biến `UPSTREAM_ORIGIN`.
4. In ra URL `workers.dev` cố định.
5. Chờ bạn lưu URL đó vào SePay.
6. Gọi heartbeat qua URL `workers.dev` trước khi mở thanh toán QR.
7. Duy trì heartbeat cho tới khi bạn đóng cửa sổ tunnel.

URL cần lưu trên SePay có dạng:

~~~text
https://quanlynhahang-sepay-webhook.<account>.workers.dev/api/customer-payments/sepay/webhook
~~~

Không lưu URL `trycloudflare.com` vào SePay nữa. Quick Tunnel vẫn có thể đổi URL sau mỗi lần chạy, nhưng URL `workers.dev` của Worker không đổi.

Nếu đóng cửa sổ tunnel, heartbeat sẽ hết hạn và ứng dụng sẽ tự khóa thanh toán QR theo readiness hiện có.

## 7. Kiểm tra trạng thái

~~~powershell
docker compose ps
docker compose logs -f api-gateway
docker compose logs -f api
~~~

API health dùng chung:

~~~text
http://localhost:8080/health/live
http://localhost:8080/health/ready
~~~

## 8. Giữ dữ liệu local

Dừng container nhưng giữ database:

~~~powershell
docker compose down
~~~

Không dùng `docker compose down -v` nếu muốn giữ dữ liệu vì `-v` xóa Docker volume.
