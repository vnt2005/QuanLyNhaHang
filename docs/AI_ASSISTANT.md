# Trợ lý AI cho CustomerWeb và AdminWeb bằng Google AI Studio

## Mục tiêu

Trợ lý AI không dùng một bản sao dữ liệu tĩnh. Khi câu hỏi cần dữ liệu thực tế, Gemini dùng **function calling** để yêu cầu backend đọc dữ liệu mới nhất từ database rồi mới trả lời.

Có hai phạm vi riêng:

- **Customer AI**: tư vấn nhà hàng, thực đơn, giá, khuyến mãi, bàn/đặt bàn, chức năng website; nếu Customer đã đăng nhập thì đọc thêm đơn hàng, trạng thái bếp, thanh toán, hóa đơn và thông báo của **chính tài khoản đó**.
- **Admin AI**: trợ lý vận hành read-only, có thể truy vấn dữ liệu từ các module của WebApp để tổng hợp tình hình cho Admin.

AI chỉ đọc và tư vấn; nó không tự tạo/hủy đơn, xác nhận đặt bàn, thay đổi thanh toán, sửa kho hoặc mutate dữ liệu nghiệp vụ.

## Kiến trúc

```text
CustomerWeb / AdminWeb
        |
        | POST /api/ai-assistant/chat
        | POST /api/ai-assistant/admin-chat
        v
QuanLyNhaHang.Api
        |
        +--> xác định scope người gọi
        +--> Gemini generateContent + function declarations
        |          |
        |          +--> functionCall
        |                    |
        |                    v
        |          AiAssistantDataProvider
        |                    |
        |                    +--> EF Core / SQL Server (READ ONLY)
        |                    |
        |          functionResponse
        |                    |
        +<-------------------+
        |
        +--> Gemini tổng hợp câu trả lời
```

Gemini API key chỉ tồn tại ở backend. Không tạo `VITE_GEMINI_API_KEY` và không đưa key vào JavaScript, CustomerWeb, AdminWeb hoặc source control.

## Customer AI đọc được gì?

Các tool hiện có:

- `get_restaurant_info`: thông tin nhà hàng, giờ hoạt động, VAT/phí phục vụ, khu vực và trạng thái bàn.
- `get_payment_options`: danh mục phương thức thanh toán chuẩn, phương thức nào dùng được trên CustomerWeb/tại quầy và trạng thái sẵn sàng hiện tại của kênh QR SePay. Tool không trả số tài khoản hoặc secret.
- `search_menu`: tìm món/danh mục/giá/tình trạng đang bán trực tiếp từ dữ liệu hiện tại.
- `get_active_promotions`: lấy khuyến mãi còn hiệu lực và còn lượt sử dụng.
- `get_table_availability`: kiểm tra bàn phù hợp theo số khách và thời gian dự kiến; chỉ tham khảo, không tự đặt bàn.
- `get_website_capabilities`: hướng khách tới đúng chức năng CustomerWeb.
- `get_my_orders`: chỉ khi đăng nhập; đọc đơn thuộc `CustomerUserId` hiện tại, kèm trạng thái món/bếp, thanh toán, payment attempt và hóa đơn.
- `get_my_notifications`: chỉ khi đăng nhập; đọc thông báo thuộc đúng `UserId` hiện tại.

CustomerWeb gửi access token hiện tại vào endpoint AI nếu khách đang đăng nhập. Backend không hỗ trợ AI tìm đơn riêng bằng tên, email hay số điện thoại để tránh đọc nhầm dữ liệu của khách khác.

## Admin AI đọc được gì?

AdminWeb có khu vực **AI dành cho Admin**. Endpoint `/api/ai-assistant/admin-chat` chỉ cho role `Admin` và dùng tool read-only để đọc:

- Dashboard/tổng quan vận hành.
- Tài khoản và thống kê phân quyền.
- Nhân viên và ca làm.
- Khu vực, bàn và trạng thái bàn.
- Thực đơn/danh mục/tình trạng món.
- Đơn hàng và bếp.
- Thanh toán và payment attempts.
- Hóa đơn.
- Doanh thu.
- Đặt bàn.
- Khuyến mãi.
- Tồn kho và giao dịch kho.
- Nhật ký hoạt động.
- Thông báo.
- QR bàn và thao tác bàn.
- Cấu hình nhà hàng.

Admin có thêm `get_payment_options` để phân biệt rõ:

- catalog phương thức mà hệ thống cho phép;
- trạng thái cấu hình/sẵn sàng của kênh QR SePay;
- phương thức thực tế đã xuất hiện trong các Payment trạng thái `Paid`.

AI có thể gọi nhiều module trong một câu hỏi, ví dụ: “Hôm nay doanh thu thế nào, còn bao nhiêu đơn đang nấu và nguyên liệu nào sắp hết?”.

## Mapping intent → tool → nguồn dữ liệu

| Đối tượng | Intent/câu hỏi phổ biến | Tool bắt buộc | Bảng/nguồn dữ liệu | Phạm vi |
|---|---|---|---|---|
| Customer/Admin | Phương thức thanh toán, tiền mặt, thẻ, QR, chuyển khoản, ví điện tử | `get_payment_options` | `PaymentMethodCatalog`, `IPaymentGateway`, `IPaymentChannelReadiness`; Admin đọc thêm thống kê `Payments` đã `Paid` | Customer không nhận số liệu giao dịch; Admin không nhận secret/cấu hình tài khoản ngân hàng |
| Customer | Thực đơn, món, danh mục, giá | `search_menu` | `MenuItems`, `MenuCategories` | Chỉ món/category đang hoạt động; mặc định chỉ món đang bán |
| Customer | Bàn trống/đặt bàn theo số khách và giờ | `get_table_availability` | `RestaurantTables`, `Areas`, `Reservations` | Chỉ tham khảo và không tự tạo đặt bàn |
| Customer | Khuyến mãi/mã giảm giá | `get_active_promotions` | `Promotions` | Chỉ mã đang hoạt động, còn hạn và còn lượt |
| Customer | Giờ mở cửa, VAT, phí, địa chỉ/liên hệ | `get_restaurant_info` | `RestaurantSettings`, `Areas`, `RestaurantTables` | Dữ liệu công khai của nhà hàng |
| Customer đã đăng nhập | Trạng thái đơn/món/bếp/thanh toán/hóa đơn của tôi | `get_my_orders` | `Orders`, `OrderItems`, `Payments`, `PaymentAttempts`, `Invoices` | Bắt buộc lọc đúng `CustomerUserId`; chưa đăng nhập chỉ hướng dẫn đăng nhập |
| Admin | Danh sách/trạng thái đơn | `get_admin_module_data(module="orders")` | `Orders`, `OrderItems` | Loại dữ liệu nhận dạng khách không cần thiết |
| Admin | Giao dịch thanh toán | `get_admin_module_data(module="payments")` | `Payments`, `PaymentAttempts` | Read-only |
| Admin | Hóa đơn | `get_admin_module_data(module="invoices")` | `Invoices` | Read-only |
| Admin | Doanh thu | `get_admin_module_data(module="revenue")` | `Payments` trạng thái `Paid`, `RevenueReports` | Read-only |
| Admin | Tồn kho/nguyên liệu | `get_admin_module_data(module="inventory")` | `Ingredients`, `InventoryTransactions` | Read-only |
| Admin | Giờ mở cửa/VAT/phí/cấu hình | `get_admin_module_data(module="restaurant_settings")` | `RestaurantSettings` | Không đưa AI system prompt hoặc secret |

`PaymentMethodCatalog` là nguồn chuẩn duy nhất cho validation backend và AI. Hiện catalog gồm `BankTransfer`, `Cash`, `Card`, `EWallet`, `Momo`, `ZaloPay`, `Other`. CustomerWeb tự tạo duy nhất luồng `BankTransfer` bằng QR/SePay; các phương thức còn lại do thu ngân ghi nhận tại quầy.

## Dữ liệu cố ý KHÔNG gửi tới Gemini

“All modules” không có nghĩa là đưa toàn bộ raw database cho provider. Backend chủ động loại các trường không cần thiết hoặc quá nhạy cảm, gồm:

- `PasswordHash`.
- Mã xác minh email, 2FA, reset password và trạng thái bí mật liên quan.
- `GEMINI_API_KEY` và các secret máy chủ.
- QR token/URL nội bộ dùng để xác thực bàn.
- Activity Log `OldValues`, `NewValues`, IP và User-Agent.
- Customer AI không nhận dữ liệu Admin, nhân viên, doanh thu, kho hoặc dữ liệu của khách khác.
- Admin AI không gửi tên/email/số điện thoại khách trong công cụ đơn hàng/đặt bàn khi các trường đó không cần cho câu hỏi vận hành.

## Function calling

Backend gửi danh sách function declarations cho Gemini. Nếu model cần dữ liệu, Gemini trả `functionCall`; backend thực thi truy vấn EF Core tương ứng rồi gửi `functionResponse` trở lại Gemini. Với Gemini 3.x, backend giữ lại `functionCall.id` và trả đúng `id` trong `functionResponse`.

Các câu hỏi nghiệp vụ phổ biến còn đi qua lớp định tuyến xác định trước. Ở vòng đầu, backend dùng `mode=ANY` cùng `allowedFunctionNames` để buộc Gemini gọi đúng nhóm tool đã nhận diện; từ vòng tiếp theo chuyển lại `AUTO` để Gemini tổng hợp câu trả lời hoặc gọi thêm nguồn. Với Admin, khi chỉ có một intent module, backend cũng khóa lại giá trị `module` đã mapping để tránh model gửi nhầm module.

Mỗi lượt chỉ cho phép số vòng tool hữu hạn để tránh vòng lặp. Các tool đều read-only và giới hạn số bản ghi trả về.

## Gemini 3.7 Flash

Model mặc định là `gemini-3.7-flash`. Request dùng `thinkingConfig.thinkingLevel = low` để phù hợp chatbot phản hồi nhanh và không gửi các sampling parameter cũ như `temperature/top_p/top_k` cho model này.

`generateContent` được gọi ở chế độ stateless với `store=false`. Lịch sử ngắn cần thiết được frontend gửi lại trong từng request.

## Lớp an toàn

1. CustomerWeb/AdminWeb không bao giờ nhận Gemini API key.
2. Input tối đa 1200 ký tự; lịch sử tối đa 8 tin gần nhất.
3. Endpoint chat dùng rate limit của dự án.
4. Gemini dùng safety settings cho hate speech, harassment, sexually explicit và dangerous content ở `BLOCK_MEDIUM_AND_ABOVE`.
5. `generateContent` gửi `store: false`.
6. System instruction cấm tiết lộ prompt/secret, bịa dữ liệu hoặc giả vờ đã mutate hệ thống.
7. Không lưu transcript chat vào database trong phiên bản này.
8. Data source được trả về cho UI để người dùng/Admin biết AI đã truy vấn module nào.

## Cấu hình local

### Docker Compose

1. Sao chép `.env.example` thành `.env` nếu chưa có.
2. Tạo/copy Gemini API key trong Google AI Studio.
3. Điền key vào `.env` cục bộ:

```env
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
```

4. Không commit `.env`.
5. Build lại:

```powershell
docker compose up --build -d
```

Compose chỉ chuyển `GEMINI_API_KEY` vào service `api`.

### Chạy backend trực tiếp

```powershell
$env:GEMINI_API_KEY="<YOUR_GEMINI_API_KEY>"
dotnet run --project .\QuanLyNhaHang.Api\QuanLyNhaHang.Api.csproj
```

Có thể dùng `GoogleAI:ApiKey` trong secret store phù hợp, nhưng không ghi key thật vào `appsettings*.json` được commit.

## Database

Các trường cấu hình AI tiếp tục dùng `RestaurantSettings`.

Migration `20260901133000_SwitchAiAssistantProviderToGemini` chuyển cấu hình model `gpt-*` cũ sang `gemini-3.7-flash`, nên local database đã chạy bản OpenAI không cần xóa volume.

CI tiếp tục kiểm tra EF snapshot và dựng SQL Server + API thật với startup migration bật.

## Free Tier

Gemini Developer API có Free Tier cho model/quota đủ điều kiện; RPM/TPM/RPD có thể thay đổi theo model, project, tài khoản và khu vực. Khi vượt quota, backend trả lỗi quota rõ ràng thay vì làm API crash.

Dữ liệu dùng trên Free Tier có thể chịu điều khoản sử dụng dữ liệu của Google hiện hành. Vì vậy thiết kế chủ động tối thiểu hóa PII/secret trước khi gửi context/tool result tới Gemini.

## Tài liệu Google đã tham khảo

- Gemini API docs: https://ai.google.dev/gemini-api/docs
- Function calling: https://ai.google.dev/gemini-api/docs/function-calling
- `generateContent`: https://ai.google.dev/api/generate-content
- Gemini models: https://ai.google.dev/gemini-api/docs/models
- Safety settings: https://ai.google.dev/gemini-api/docs/safety-settings
- Pricing / Free Tier: https://ai.google.dev/gemini-api/docs/pricing
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- API keys: https://ai.google.dev/gemini-api/docs/api-key

## Checklist kiểm thử

- AdminWeb và CustomerWeb build xanh.
- Backend unit/integration tests xanh.
- EF Core không có pending model changes.
- API Docker khởi động healthy với startup migration.
- Không có `GEMINI_API_KEY` thật trong Git history/frontend bundle.
- Nút Lưu cấu hình AI có thông báo thành công/thất bại rõ ràng ngay tại viewport.
- Customer AI hỏi món/giá/khuyến mãi/bàn thì có data source tương ứng.
- Câu “Nhà hàng có các phương thức thanh toán nào?” bắt buộc gọi `get_payment_options` và phân biệt CustomerWeb với tại quầy.
- Customer đăng nhập hỏi đơn của mình thì chỉ nhận dữ liệu `CustomerUserId` hiện tại.
- Customer chưa đăng nhập không thể dùng AI để đọc dữ liệu đơn riêng.
- Admin AI có thể hỏi chéo nhiều module và chỉ thực hiện truy vấn read-only.
- Bộ regression mapping bao phủ thanh toán, thực đơn, bàn, khuyến mãi, giờ mở cửa, trạng thái đơn, hóa đơn, doanh thu và tồn kho.
- Prompt injection không làm lộ secret/system prompt.
- Light/dark mode dùng palette ấm/slate, không còn mảng trắng/đen gắt ở khu vực AI.
