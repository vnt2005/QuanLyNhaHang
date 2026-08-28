# Chạy QuanLyNhaHang bằng Docker

## Chuẩn bị

Cài Docker Desktop và bảo đảm lệnh `docker compose version` chạy được.

Tại thư mục gốc của repository, tạo file cấu hình local:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và thay mật khẩu SQL Server, JWT secret cùng thông tin SMTP/SePay cần dùng. File `.env` chứa bí mật và đã được Git bỏ qua; không commit hoặc gửi file này cho người khác.

## Kiến trúc local sau khi chuẩn hóa

Browser chỉ dùng **một địa chỉ API duy nhất**:

```text
http://localhost:8080
```

Cổng `8080` thuộc về `api-gateway` (Nginx):

```text
Admin Web :5173 ─────┐
                     ├──> API Gateway :8080
CustomerWeb :5174 ───┘          │
                                ├── ưu tiên Visual Studio API :18080 khi đang debug
                                └── fallback Docker API api:8080 khi Visual Studio không chạy
```

`18080` chỉ là cổng nội bộ dành cho Visual Studio debug. Frontend, SePay tunnel và người dùng **không gọi trực tiếp cổng này**.

Nhờ gateway, bạn có thể giữ toàn bộ Docker stack đang chạy rồi bấm Run/F5 `QuanLyNhaHang.Api` trong Visual Studio. Không còn xung đột cổng 8080. Khi Visual Studio API sẵn sàng, request mới sẽ tự đi qua bản debug; khi tắt Visual Studio, gateway tự quay về API Docker.

## Khởi động toàn bộ hệ thống

```powershell
docker compose up -d --build
```

Compose khởi động:

1. SQL Server 2022 Developer và giữ dữ liệu trong Docker volume.
2. Mailpit để nhận email local.
3. API Docker (chỉ expose nội bộ trong Docker network).
4. API Gateway công khai tại `http://localhost:8080`.
5. Web App Admin tại `http://localhost:5173`.
6. CustomerWeb tại `http://localhost:5174`.

Sau khi các container chạy:

- Web App Admin: `http://localhost:5173`
- Website khách hàng: `http://localhost:5174`
- API dùng chung: `http://localhost:8080`
- API health: `http://localhost:8080/health`
- OpenAPI JSON: `http://localhost:8080/openapi/v1.json`
- Mailpit: `http://localhost:8025`
- SQL Server: `localhost,1433`

Không cần chạy `npm run dev` riêng cho hai frontend khi dùng full Docker.

## Debug API bằng Visual Studio trong khi Docker vẫn chạy

Giữ Docker đang chạy bình thường rồi bấm Run/F5 project `QuanLyNhaHang.Api`.

Visual Studio sẽ bind nội bộ ở:

```text
http://0.0.0.0:18080
```

Bạn **không mở URL này trong browser**. API Gateway ở `localhost:8080` sẽ tự phát hiện và ưu tiên bản debug.

Khi dừng debug Visual Studio, không cần chạy thêm lệnh: gateway tự fallback về API Docker.

Lưu ý: Visual Studio API và Docker API cần cùng trỏ tới database local và dùng cùng cấu hình JWT/SePay nếu muốn chuyển qua lại mà không làm mất phiên. Hãy giữ User Secrets của Visual Studio đồng bộ với `.env` cho các giá trị tương ứng.

## Dùng npm run dev cho frontend

Nếu muốn hot reload giao diện, dừng riêng hai frontend Docker:

```powershell
docker compose stop admin-web customer-web
```

Sau đó chạy:

```powershell
cd QuanLyNhaHang.Frontend
npm run dev
```

và terminal khác:

```powershell
cd QuanLyNhaHang.CustomerWeb
npm run dev
```

Cả hai Vite dev server vẫn gọi đúng API Gateway `http://localhost:8080`.

Muốn quay lại frontend Docker:

```powershell
docker compose up -d --build admin-web customer-web
```

## Kiểm tra trạng thái và log

```powershell
docker compose ps
docker compose logs -f api-gateway
docker compose logs -f api
docker compose logs -f admin-web
docker compose logs -f customer-web
```

Nếu vừa cập nhật code từ GitHub:

```powershell
git pull --ff-only origin main
docker compose up -d --build
```

## Dừng hệ thống nhưng giữ dữ liệu

```powershell
docker compose down
```

Lệnh trên dừng/xóa container nhưng **không xóa Docker volume SQL Server**, nên database local vẫn được giữ.

## Lưu ý triển khai

Gateway ưu tiên `host.docker.internal:18080` chỉ phục vụ workflow development local với Docker Desktop. Không dùng cấu hình fallback Visual Studio này cho production.

Hai frontend trong Compose local được build thành static assets và serve bằng Nginx. Các biến `VITE_*` được truyền vào lúc Docker build, vì vậy khi đổi `BROWSER_API_BASE_URL` hoặc URL CustomerWeb cần chạy lại `docker compose up -d --build`.

`Database__ApplyMigrationsOnStartup=true` chỉ được bật trong Compose local. Khi triển khai production, hãy quản lý migration bằng một bước phát hành riêng và lưu connection string, JWT secret, SMTP credentials trong secret manager của nền tảng triển khai.
