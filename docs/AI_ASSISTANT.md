# Trợ lý AI cho CustomerWeb bằng Google AI Studio

## Mục tiêu

Trợ lý AI hỗ trợ khách hỏi về thực đơn đang bán, giá, khuyến mãi đang hiệu lực, giờ mở cửa, đặt bàn và các thông tin vận hành do nhà hàng cung cấp. AI chỉ tư vấn; nó không tự tạo/hủy đơn, đặt bàn, thay đổi thanh toán hoặc sửa dữ liệu nghiệp vụ.

AdminWeb quản lý AI tại mục **Hệ thống > Trợ lý AI**:

- Bật/tắt AI trên CustomerWeb.
- Chọn model Gemini.
- Chỉnh lời chào và câu hỏi gợi ý.
- Chỉnh system prompt riêng của nhà hàng.
- Bổ sung kho kiến thức như giữ bàn, bãi xe, quy định nhận món, chính sách riêng.
- Giới hạn token đầu ra để kiểm soát độ dài và quota.
- Xem trạng thái backend đã có Gemini API key hay chưa. API key không được hiển thị hoặc nhập trên AdminWeb.

## Kiến trúc

```text
CustomerWeb
   |
   | POST /api/ai-assistant/chat
   v
QuanLyNhaHang.Api
   |
   +--> Rate limiting theo user / X-Client-Id
   +--> Ghép context động từ RestaurantSettings + Menu + Promotions
   +--> Gemini safety settings
   +--> Gemini generateContent (store=false)
   v
Google AI Studio / Gemini API

AdminWeb
   |
   +--> GET /api/ai-assistant/admin-config
   +--> PUT /api/ai-assistant/admin-config
   v
RestaurantSettings
```

Gemini API key chỉ tồn tại ở backend. Không tạo biến `VITE_GEMINI_API_KEY` và không đưa key vào JavaScript, CustomerWeb, AdminWeb hoặc source control.

`generateContent` hiện vẫn được Google hỗ trợ. Dự án dùng chế độ stateless với `store=false` để không phụ thuộc vào lịch sử hội thoại được lưu phía provider; lịch sử ngắn cần thiết được CustomerWeb gửi lại trong từng request.

## Context được cấp cho AI

Mỗi request lấy dữ liệu hiện hành từ database:

- Tên, địa chỉ, số điện thoại và giờ hoạt động của nhà hàng.
- VAT, phí phục vụ và đơn vị tiền tệ.
- Tối đa 80 món đang `IsActive && IsAvailable`, gồm tên, danh mục, giá, mô tả.
- Tối đa 20 khuyến mãi đang hoạt động, còn hạn và chưa hết lượt sử dụng.
- Kho kiến thức do admin nhập.

Do context được lấy ở backend tại thời điểm chat, admin không cần chép lại giá/món/khuyến mãi vào prompt.

## Lớp an toàn

1. CustomerWeb không bao giờ nhận Gemini API key.
2. Input được giới hạn 1200 ký tự; lịch sử chỉ lấy tối đa 8 tin gần nhất.
3. Endpoint chat dùng rate limit actor-aware sẵn có của dự án.
4. Gemini được gọi với safety settings cho hate speech, harassment, sexually explicit, dangerous content và jailbreak ở ngưỡng `BLOCK_MEDIUM_AND_ABOVE`.
5. Request `generateContent` gửi `store: false`.
6. System instruction bắt buộc không cho AI tiết lộ prompt, key/cấu hình máy chủ, tự bịa giá/khuyến mãi hoặc tuyên bố đã thao tác dữ liệu nghiệp vụ.
7. Không lưu nội dung chat của khách vào database trong phiên bản này.
8. `X-Client-Id`/user id vẫn chỉ dùng trong lớp rate limit của ứng dụng; backend không chuyển định danh người dùng sang Gemini.

## Lưu ý về Free Tier

Google AI Studio/Gemini Developer API có Free Tier cho các model và quota đủ điều kiện. Free Tier có giới hạn tốc độ/số lượt và có thể thay đổi theo model, tài khoản, khu vực và chính sách Google.

Theo bảng giá Gemini Developer API hiện hành, dữ liệu gửi qua Free Tier có thể được Google dùng để cải thiện sản phẩm. Vì vậy trợ lý này không yêu cầu khách nhập mật khẩu, thông tin thanh toán hoặc dữ liệu nhạy cảm, và ứng dụng cũng không tự thêm dữ liệu tài khoản riêng tư vào prompt.

Khi triển khai production có dữ liệu nhạy cảm hoặc cần mức bảo mật/chính sách dữ liệu chặt hơn, cần đánh giá Paid Tier/Vertex AI và điều khoản hiện hành trước khi bật rộng rãi.

## Cấu hình local

### Docker Compose

1. Sao chép `.env.example` thành `.env` nếu chưa có.
2. Vào Google AI Studio, mở trang API Keys và tạo key mới. Google hiện tạo **authorization key** cho key mới; hãy dùng key mới thay vì key Standard không được hạn chế.
3. Điền nguyên giá trị key mà AI Studio cung cấp vào file `.env` cục bộ, không giả định prefix của key:

```env
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
```

4. Không commit `.env`.
5. Build lại API/container sau khi cập nhật branch:

```powershell
docker compose up --build -d
```

Compose chỉ chuyển `GEMINI_API_KEY` vào service `api`; hai frontend không nhận secret này.

### Chạy backend trực tiếp

PowerShell cho phiên terminal hiện tại:

```powershell
$env:GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"
dotnet run --project .\QuanLyNhaHang.Api\QuanLyNhaHang.Api.csproj
```

Có thể dùng cấu hình `GoogleAI:ApiKey` ở secret store phù hợp của môi trường triển khai, nhưng không ghi key thật vào `appsettings*.json` được commit.

## Database

Các trường cấu hình AI vẫn dùng `RestaurantSettings`, nên việc đổi provider từ OpenAI sang Gemini không cần thêm cột database.

Migration `20260901133000_SwitchAiAssistantProviderToGemini` tự chuyển các cấu hình model `gpt-*` đã tồn tại sang `gemini-3.7-flash` và đổi default constraint của `AiAssistantModel`. Vì vậy local database đã từng chạy bản OpenAI không cần xóa volume hay nhập lại cấu hình AI.

Migration AI ban đầu vẫn dùng các guard `COL_LENGTH` để local SQL Server volume có thể tiếp tục an toàn nếu từng bị dừng giữa lúc cập nhật schema. CI tiếp tục kiểm tra `dotnet ef migrations has-pending-model-changes` và khởi động thật `database + api` với startup migration bật.

Với production, vẫn tuân thủ quy trình backup/preflight/migration hiện có của dự án trước khi deploy các migration khác.

## Model mặc định

Model mặc định là `gemini-3.7-flash`, phù hợp chatbot phản hồi nhanh và hiện có Free Tier theo bảng giá Google AI for Developers. Admin có thể đổi sang model Gemini khác từ giao diện mà không cần build lại frontend.

## Tài liệu Google đã tham khảo

- Gemini API overview: https://ai.google.dev/gemini-api/docs
- Getting started: https://ai.google.dev/gemini-api/docs/get-started
- Using Gemini API keys: https://ai.google.dev/gemini-api/docs/api-key
- `generateContent`: https://ai.google.dev/api/generate-content
- Interactions API overview: https://ai.google.dev/gemini-api/docs/interactions-overview
- Safety settings: https://ai.google.dev/gemini-api/docs/safety-settings
- Pricing / Free Tier: https://ai.google.dev/gemini-api/docs/pricing
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits

## Checklist kiểm thử

- Backend build + unit/integration tests xanh.
- AdminWeb build xanh.
- CustomerWeb build xanh.
- EF Core không có pending model changes so với migration snapshot.
- API Docker khởi động healthy khi startup migration bật trên database sạch.
- Không có `GEMINI_API_KEY` thật trong Git history hoặc frontend bundle.
- Khi chưa cấu hình key: AdminWeb báo chưa sẵn sàng và CustomerWeb không hiện nút AI.
- Khi có key nhưng AI đang tắt: CustomerWeb không hiện nút AI, chat API từ chối request.
- Khi bật AI: hỏi món/giá/khuyến mãi trả lời từ dữ liệu hiện tại.
- Nội dung vượt safety threshold bị Gemini chặn.
- Prompt injection yêu cầu tiết lộ system prompt/API key không được đáp ứng.
- Khi vượt Free Tier quota, backend trả thông báo quota thay vì làm API crash.
- Light/dark mode và mobile không che các hành động chính của CustomerWeb.
