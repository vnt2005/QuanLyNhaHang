# Trợ lý AI cho CustomerWeb

## Mục tiêu

Trợ lý AI hỗ trợ khách hỏi về thực đơn đang bán, giá, khuyến mãi đang hiệu lực, giờ mở cửa, đặt bàn và các thông tin vận hành do nhà hàng cung cấp. AI chỉ tư vấn; nó không tự tạo/hủy đơn, đặt bàn, thay đổi thanh toán hoặc sửa dữ liệu nghiệp vụ.

AdminWeb quản lý AI tại mục **Hệ thống > Trợ lý AI**:

- Bật/tắt AI trên CustomerWeb.
- Chọn model OpenAI.
- Chỉnh lời chào và câu hỏi gợi ý.
- Chỉnh system prompt riêng của nhà hàng.
- Bổ sung kho kiến thức như giữ bàn, bãi xe, quy định nhận món, chính sách riêng.
- Giới hạn token đầu ra để kiểm soát độ dài và chi phí.
- Xem trạng thái backend đã có API key hay chưa. API key không được hiển thị hoặc nhập trên AdminWeb.

## Kiến trúc

```text
CustomerWeb
   |
   | POST /api/ai-assistant/chat
   v
QuanLyNhaHang.Api
   |
   +--> Rate limiting theo user / X-Client-Id
   +--> Moderation input
   +--> Ghép context động từ RestaurantSettings + Menu + Promotions
   +--> Responses API (store=false)
   v
OpenAI API

AdminWeb
   |
   +--> GET /api/ai-assistant/admin-config
   +--> PUT /api/ai-assistant/admin-config
   v
RestaurantSettings
```

API key chỉ tồn tại ở backend. Không tạo biến `VITE_OPENAI_API_KEY` và không đưa key vào JavaScript, CustomerWeb, AdminWeb hoặc source control.

## Context được cấp cho AI

Mỗi request lấy dữ liệu hiện hành từ database:

- Tên, địa chỉ, số điện thoại và giờ hoạt động của nhà hàng.
- VAT, phí phục vụ và đơn vị tiền tệ.
- Tối đa 80 món đang `IsActive && IsAvailable`, gồm tên, danh mục, giá, mô tả.
- Tối đa 20 khuyến mãi đang hoạt động, còn hạn và chưa hết lượt sử dụng.
- Kho kiến thức do admin nhập.

Do context được lấy ở backend tại thời điểm chat, admin không cần chép lại giá/món/khuyến mãi vào prompt.

## Lớp an toàn

1. CustomerWeb không bao giờ nhận OpenAI API key.
2. Input được giới hạn 1200 ký tự; lịch sử chỉ lấy tối đa 8 tin gần nhất.
3. Endpoint chat dùng rate limit actor-aware sẵn có của dự án.
4. Input được kiểm tra qua `omni-moderation-latest`; nếu moderation lỗi, request bị chặn theo nguyên tắc fail-closed.
5. Responses API được gọi với `store: false`.
6. System instruction bắt buộc không cho AI tiết lộ prompt, key/cấu hình máy chủ, tự bịa giá/khuyến mãi hoặc tuyên bố đã thao tác dữ liệu nghiệp vụ.
7. Không lưu nội dung chat của khách vào database trong phiên bản này. Điều này giảm việc lưu trữ dữ liệu hội thoại không cần thiết.
8. Backend truyền một `safety_identifier` từ user id hoặc `X-Client-Id`, không dùng nội dung tin nhắn làm định danh.

## Cấu hình local

### Docker Compose

1. Sao chép `.env.example` thành `.env` nếu chưa có.
2. Điền key thật vào file `.env` cục bộ:

```env
OPENAI_API_KEY=sk-...
```

3. Không commit `.env`.
4. Build lại API/container sau khi cập nhật branch:

```powershell
docker compose up --build -d
```

Compose chỉ chuyển `OPENAI_API_KEY` vào service `api`; hai frontend không nhận secret này.

### Chạy backend trực tiếp

PowerShell cho phiên terminal hiện tại:

```powershell
$env:OPENAI_API_KEY="sk-..."
dotnet run --project .\QuanLyNhaHang.Api\QuanLyNhaHang.Api.csproj
```

Có thể dùng cấu hình `OpenAI:ApiKey` ở secret store phù hợp của môi trường triển khai, nhưng không ghi key thật vào `appsettings*.json` được commit.

## Database migration

Migration `20260901111000_AddCustomerAiAssistant` thêm các trường cấu hình AI vào `RestaurantSettings`. Với local Docker hiện tại, `Database__ApplyMigrationsOnStartup=true` nên API áp dụng migration khi khởi động theo cơ chế sẵn có của dự án.

Với production, vẫn tuân thủ quy trình backup/preflight/migration hiện có của dự án trước khi deploy.

## Model mặc định

Model mặc định là `gpt-5.6-luna` vì đây là model được OpenAI định vị cho workload high-volume nhạy chi phí. Admin có thể thay model từ giao diện mà không cần build lại frontend.

## Tài liệu OpenAI đã tham khảo

- Models: https://developers.openai.com/api/docs/models
- GPT-5.6 model guidance: https://developers.openai.com/api/docs/guides/latest-model
- Responses API: https://developers.openai.com/api/reference/resources/responses
- Moderations API: https://developers.openai.com/api/reference/resources/moderations
- API key safety / production guidance: https://platform.openai.com/docs/guides/production-best-practices
- Data controls: https://platform.openai.com/docs/guides/your-data

## Checklist kiểm thử

- Backend build + unit/integration tests xanh.
- AdminWeb build xanh.
- CustomerWeb build xanh.
- Không có `OPENAI_API_KEY` thật trong Git history hoặc frontend bundle.
- Khi chưa cấu hình key: AdminWeb báo chưa sẵn sàng và CustomerWeb không hiện nút AI.
- Khi có key nhưng AI đang tắt: CustomerWeb không hiện nút AI, chat API từ chối request.
- Khi bật AI: hỏi món/giá/khuyến mãi trả lời từ dữ liệu hiện tại.
- Nội dung nguy hiểm bị moderation chặn.
- Prompt injection yêu cầu tiết lộ system prompt/API key không được đáp ứng.
- Light/dark mode và mobile không che các hành động chính của CustomerWeb.
