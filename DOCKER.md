# Chạy QuanLyNhaHang bằng Docker

## Chuẩn bị

Cài Docker Desktop và bảo đảm `docker compose version` chạy được.

Tại thư mục gốc repository, tạo file cấu hình local nếu chưa có:

```powershell
Copy-Item .env.example .env
```

Giữ bí mật thật trong `.env`; file này không commit lên Git.

## Kiến trúc local

Tất cả frontend chỉ gọi một API duy nhất:

```text
http://localhost:8080
```

API Gateway ở cổng `8080` tự chọn backend:

```text
Browser frontend ──> API Gateway :8080
                         │
                         ├─ Visual Studio API :18080 khi đang debug
                         └─ Docker API api:8080 khi Visual Studio không chạy
```

## Docker và Vite chạy cùng lúc

Docker frontend và Vite dev dùng hai cặp cổng khác nhau để không tranh cổng:

```text
Docker Admin        http://localhost:4173
Docker CustomerWeb  http://localhost:4174

Vite Admin          http://localhost:5173
Vite CustomerWeb    http://localhost:5174

API chung           http://localhost:8080
```

Vì vậy có thể giữ nguyên full Docker stack rồi mở thêm `npm run dev` ở hai frontend. Không cần `docker compose stop admin-web customer-web` nữa.

## Khởi động toàn bộ Docker stack

```powershell
docker compose up -d --build
```

Compose khởi động:

1. SQL Server.
2. Mailpit.
3. Docker API nội bộ.
4. API Gateway tại `http://localhost:8080`.
5. Docker Admin tại `http://localhost:4173`.
6. Docker CustomerWeb tại `http://localhost:4174`.

Kiểm tra:

```powershell
docker compose ps
```

## Chạy thêm Vite dev mà không dừng Docker

Terminal Admin:

```powershell
cd QuanLyNhaHang.Frontend
npm run dev
```

Terminal CustomerWeb:

```powershell
cd QuanLyNhaHang.CustomerWeb
npm run dev
```

Sau đó có thể mở đồng thời cả bốn frontend:

- Docker Admin: `http://localhost:4173`
- Docker CustomerWeb: `http://localhost:4174`
- Vite Admin: `http://localhost:5173`
- Vite CustomerWeb: `http://localhost:5174`

Tất cả đều gọi `http://localhost:8080`.

## Debug API bằng Visual Studio trong khi Docker vẫn chạy

Giữ Docker stack đang chạy rồi bấm Run/F5 project `QuanLyNhaHang.Api`.

Visual Studio bind API debug tại cổng kỹ thuật `18080`; browser không gọi trực tiếp cổng này. API Gateway `8080` sẽ ưu tiên bản Visual Studio khi nó đang chạy và fallback về Docker API khi dừng debug.

CORS của local debug cho phép cả bốn frontend `4173`, `4174`, `5173`, `5174`.

## Địa chỉ local

- API chung: `http://localhost:8080`
- API health: `http://localhost:8080/health`
- Docker Admin: `http://localhost:4173`
- Docker CustomerWeb: `http://localhost:4174`
- Vite Admin: `http://localhost:5173`
- Vite CustomerWeb: `http://localhost:5174`
- Mailpit: `http://localhost:8025`
- SQL Server: `localhost,1433`

## Log

```powershell
docker compose logs -f api-gateway
docker compose logs -f api
docker compose logs -f admin-web
docker compose logs -f customer-web
```

## Dừng Docker nhưng giữ dữ liệu

```powershell
docker compose down
```

Không dùng `docker compose down -v` nếu cần giữ database/volume.

## Lưu ý

Các port Docker frontend dùng biến mới `DOCKER_ADMIN_PORT` và `DOCKER_CUSTOMER_PORT`. Các biến cũ `FRONTEND_PORT` và `CUSTOMER_FRONTEND_PORT` không còn điều khiển Compose, vì vậy `.env` cũ trên máy không làm Docker quay lại chiếm `5173/5174`.
