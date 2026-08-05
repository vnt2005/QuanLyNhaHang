# Chương 10 – Dependable Systems

Tài liệu này đối chiếu hệ thống **QuanLyNhaHang** với Chương 10 –
*Dependable systems* trong *Software Engineering, 10th Edition* của Ian
Sommerville.

Mục tiêu của việc áp dụng chương này không phải tuyên bố hệ thống đã đạt mức
sẵn sàng sản xuất cao, mà là:

- đánh giá mức độ đáng tin cậy hiện tại;
- biến các thuộc tính dependability thành yêu cầu có thể kiểm tra;
- bảo vệ các nghiệp vụ quan trọng của nhà hàng;
- bổ sung cơ chế phát hiện lỗi, phục hồi dữ liệu và quy trình vận hành;
- ghi nhận rõ các giới hạn còn lại.

## 1. Kết luận kiểm tra repository

Trước nhánh `agent/chapter-10-dependability`, dự án đã có nền tảng tốt:

- Clean Architecture, CQRS và phân tách dependency rõ ràng;
- JWT, phiên đăng nhập có thể thu hồi, RBAC/permission, CORS và rate limit;
- Activity Log cho thao tác nghiệp vụ;
- unit test, integration test, Playwright E2E, Docker smoke test và CI;
- SQL Server dùng volume bền vững;
- endpoint `/health` kiểm tra tiến trình API.

Các khoảng trống chính được xử lý hoặc đặc tả trong nhánh này:

- tách **liveness** và **readiness**, trong đó readiness kiểm tra SQL Server;
- lỗi không dự kiến trả HTTP 500 an toàn, có `traceId` và không lộ exception;
- bổ sung quy trình backup/restore có checksum và bước verify;
- xác định mục tiêu RPO/RTO, vai trò vận hành và quy trình xử lý sự cố;
- đặc tả các invariant nghiệp vụ quan trọng;
- ghi rõ lý do chưa bật retry SQL Server tự động cho toàn bộ command.

Đánh giá hiện tại: hệ thống đạt **mức dependability cơ sở phù hợp cho đồ án và
môi trường demo**, nhưng chưa phải hệ thống high availability hoặc
safety-critical.

## 2. Đối chiếu theo từng mục của Chương 10

| Mục | Cách áp dụng vào QuanLyNhaHang | Đánh giá |
|---|---|---|
| 10.1 Dependability properties | Xác định availability, reliability, safety, security và resilience; chuyển thành yêu cầu kiểm tra được | Đạt mức cơ sở |
| 10.2 Sociotechnical systems | Xem xét API, database, Docker, người dùng, vai trò và quy trình vận hành như một hệ thống thống nhất | Đạt một phần |
| 10.3 Redundancy and diversity | Có backup độc lập và nhiều lớp kiểm thử; chưa có SQL replica/API nhiều instance | Đạt một phần |
| 10.4 Dependable processes | PR, CI, unit/integration/E2E, secret guard, migration và runbook | Khá tốt cho đồ án |
| 10.5 Formal methods and dependability | Dùng invariant, state transition và database constraint ở mức nhẹ; chưa có proof/model checking chính quy | Phù hợp phạm vi đồ án |

## 3. Thuộc tính dependability của hệ thống

### 3.1 Availability – tính sẵn sàng

Hệ thống cung cấp ba endpoint:

| Endpoint | Ý nghĩa | Có phụ thuộc database |
|---|---|---|
| `GET /health` | Alias tương thích cho liveness | Không |
| `GET /health/live` | Tiến trình API còn sống và phản hồi HTTP | Không |
| `GET /health/ready` | API sẵn sàng nhận nghiệp vụ | Có, kiểm tra SQL Server |

Nguyên tắc:

- liveness không thất bại chỉ vì database tạm gián đoạn;
- readiness phải không khỏe khi SQL Server không sử dụng được;
- response health là JSON, gồm trạng thái chung, thời gian thực thi và từng
  dependency nhưng không trả exception nội bộ;
- sau khi database hoạt động trở lại, readiness phải có thể tự phục hồi mà
  không cần restart API nếu tiến trình API vẫn bình thường.

### 3.2 Reliability – tính tin cậy

Reliability của hệ thống nhà hàng không chỉ là API không crash. Hệ thống còn
phải thực hiện đúng nghiệp vụ:

- không tạo trùng đơn hoặc thanh toán;
- không gửi cùng món xuống bếp nhiều lần;
- không cho chuyển trạng thái sai thứ tự;
- tổng tiền, giảm giá và VAT phải nhất quán;
- command nhiều bước phải hoàn tất toàn bộ hoặc rollback;
- lỗi kỹ thuật không được biến thành dữ liệu nghiệp vụ nửa hoàn thành.

Các biện pháp hiện có:

- validation và domain guard trong command handler/entity;
- transaction của EF Core cho mỗi lần `SaveChanges` và transaction behavior ở
  các luồng được thiết kế;
- unit test, integration test và Playwright;
- CI build backend, chạy test, build Docker image và smoke test;
- Activity Log hỗ trợ truy vết thay đổi quan trọng.

### 3.3 Safety – an toàn

QuanLyNhaHang không điều khiển thiết bị có thể gây thương tích nên không phải
safety-critical system theo nghĩa y tế, hàng không hoặc công nghiệp. Trong phạm
vi hệ thống nhà hàng, safety được hiểu là tránh hậu quả nghiệp vụ và kinh tế:

- không tính tiền âm hoặc sai tổng tiền;
- không thanh toán lặp;
- không làm mất đơn đang phục vụ;
- không gửi món nhầm bàn hoặc chuyển sai trạng thái bếp;
- không để tồn kho âm;
- không cho tài khoản bị khóa/chưa xác minh tiếp tục sử dụng phiên cũ;
- không để lỗi kỹ thuật làm lộ bí mật hoặc dữ liệu nội bộ.

### 3.4 Security – bảo mật

Các lớp bảo vệ hiện có:

- JWT kiểm tra issuer, audience, lifetime và signing key;
- token gắn với session còn hoạt động;
- tài khoản phải active và đã xác minh email;
- permission policy được kiểm tra ở backend;
- rate limit cho đăng nhập, chức năng xác thực nhạy cảm và QR order;
- CORS theo danh sách origin;
- CI từ chối `.env` và `appsettings` chứa bí mật bị commit;
- Activity Log và thu hồi phiên khi thay đổi tài khoản nhạy cảm.

Exception không dự kiến trả HTTP 500 với thông báo chung và `traceId`. Nội dung
exception thật chỉ được ghi trong log server.

### 3.5 Resilience – khả năng duy trì và phục hồi

Khi sự cố xảy ra, hệ thống phải phát hiện được, giới hạn ảnh hưởng và có đường
phục hồi:

- SQL Server dừng: API vẫn live nhưng không ready;
- API dừng: nền tảng triển khai có thể restart tiến trình;
- lỗi code: người vận hành dùng `traceId` để tra log;
- dữ liệu bị xóa hoặc hỏng: dùng bản backup đã verify để phục hồi;
- migration lỗi: dừng triển khai, đánh giá rollback hoặc restore;
- secret bị lộ: thay secret, thu hồi session và kiểm tra Activity Log.

### 3.6 Maintainability và repairability

Clean Architecture, CQRS, migration, tài liệu kiến trúc, test tự động và quy tắc
PR giúp khoanh vùng lỗi, sửa chữa và xác nhận thay đổi nhanh hơn. Hai thuộc tính
này hỗ trợ trực tiếp cho reliability và resilience.

## 4. Yêu cầu dependability có thể kiểm tra

Các mục tiêu dưới đây là baseline kỹ thuật cho môi trường đồ án/demo. Chúng chưa
phải SLA thương mại và phải được đánh giá lại trước khi production.

| ID | Yêu cầu | Cách xác nhận |
|---|---|---|
| DEP-AV-001 | Liveness trả HTTP 200 khi tiến trình API hoạt động, kể cả lúc database không sẵn sàng | Integration test và Docker smoke test |
| DEP-AV-002 | Readiness kiểm tra API và SQL Server; database lỗi làm readiness không khỏe | Integration test và thử dừng container database |
| DEP-AV-003 | Khi database hoạt động lại, readiness tự trở về trạng thái khỏe | Integration test hoặc kiểm tra vận hành |
| DEP-ERR-001 | Exception không dự kiến trả HTTP 500, không lộ message nội bộ và có `traceId` | Middleware test |
| DEP-REC-001 | File backup dùng `CHECKSUM` và phải qua `RESTORE VERIFYONLY` trước khi báo thành công | `scripts/backup-database.ps1` |
| DEP-REC-002 | Restore phải xác nhận rõ, verify backup trước và đưa database về `MULTI_USER` sau thao tác | `scripts/restore-database.ps1` và restore drill |
| DEP-REL-001 | Một request thanh toán lặp lại không được tạo hai payment thành công | Idempotency key, unique constraint và integration test |
| DEP-REL-002 | Trạng thái đơn/bếp chỉ được chuyển theo state transition đã định nghĩa | Domain guard và parameterized test |
| DEP-REL-003 | Command nhiều bước không được để lại dữ liệu nửa hoàn thành | Transaction và integration test lỗi giữa chừng |
| DEP-DATA-001 | Tổng tiền đơn/hóa đơn phải khớp với món, giảm giá và VAT theo quy tắc hệ thống | Unit/integration test |
| DEP-DATA-002 | Tồn kho không được âm và mọi biến động phải có lịch sử transaction | Domain/database constraint và integration test |
| DEP-PRO-001 | Mọi thay đổi phải build và qua unit/integration test; thay đổi UI quan trọng phải qua Playwright | GitHub Actions |
| DEP-SEC-001 | Tài khoản inactive/chưa verify hoặc session bị thu hồi không được xác thực | Integration test auth/session |
| DEP-AUD-001 | Command nghiệp vụ quan trọng phải để lại Activity Log không chứa secret | ActivityLog behavior và test |

Mục tiêu vận hành ban đầu:

- availability mục tiêu: **99,5% trong giờ nhà hàng hoạt động**;
- RPO mục tiêu: **24 giờ** khi thực hiện backup hằng ngày;
- RTO mục tiêu: **2 giờ** cho môi trường một máy/Docker;
- giữ tối thiểu 7 bản backup ngày gần nhất;
- ít nhất một bản backup nằm ngoài máy chạy database.

Các con số trên chỉ có ý nghĩa khi backup được chạy theo lịch và restore được
diễn tập. Nếu không có lịch backup, RPO thực tế là không xác định.

## 5. Invariant nghiệp vụ quan trọng

Các invariant dưới đây là đặc tả mức nhẹ theo tinh thần formal methods. Chúng cần
được bảo vệ bằng domain guard, validation, database constraint và test tùy trường
hợp.

### 5.1 Order và OrderItem

- `OrderItem.Quantity > 0`.
- Giá món tại thời điểm đặt phải được lưu cùng OrderItem; thay đổi giá menu sau
  đó không được làm thay đổi ngược đơn cũ.
- Tổng đơn phải được tính từ dữ liệu phía server, không tin tổng tiền do frontend
  gửi lên.
- Công thức baseline:

```text
OrderTotal = Sum(OrderItem.Quantity × OrderItem.UnitPrice)
             - DiscountAmount
             + VatAmount
```

- `OrderTotal >= 0`.
- Đơn đã hủy không được thanh toán.
- Đơn đã thanh toán không được sửa món hoặc tổng tiền tùy ý.
- Xóa món, đổi số lượng và tính lại tổng phải nằm trong cùng một transaction.

### 5.2 Payment và Invoice

- `Payment.Amount > 0`.
- Tổng số tiền đã thanh toán không được vượt số tiền phải trả.
- Một yêu cầu thanh toán phải có khóa idempotency khi tích hợp thanh toán thực.
- Cùng một idempotency key không được tạo hai payment thành công.
- Không được đánh dấu đơn/hóa đơn là đã thanh toán trước khi transaction lưu
  payment commit thành công.
- Nếu kết quả từ nhà cung cấp thanh toán không rõ ràng, hệ thống phải đối chiếu
  trạng thái thay vì gửi lại vô hạn.

### 5.3 Kitchen workflow

State transition baseline:

```text
Waiting -> Preparing -> Completed
Waiting -> Cancelled
Preparing -> Cancelled
```

Các chuyển trạng thái không hợp lệ phải bị từ chối, ví dụ:

```text
Waiting -> Completed
Completed -> Preparing
Cancelled -> Preparing
```

Một lần gửi bếp chỉ được tạo một kitchen item tương ứng. Cập nhật trạng thái một
item không được làm thay đổi bản ghi trùng khác.

### 5.4 Table và Reservation

- Một bàn không được có hai phiên phục vụ đang hoạt động cùng thời điểm.
- Hai reservation trên cùng một bàn không được chồng khoảng thời gian nếu cả hai
  còn hiệu lực.
- Chuyển bàn phải cập nhật đơn, bàn cũ và bàn mới trong cùng transaction.
- Gộp/tách/chuyển bàn phải có Activity Log để truy vết người thực hiện.

### 5.5 Inventory

- Số lượng tồn sau giao dịch không được âm.
- Mọi thay đổi tồn kho phải có `InventoryTransaction` tương ứng.
- Cập nhật số lượng và ghi lịch sử giao dịch phải cùng commit hoặc cùng rollback.
- Không cho phép client tự quyết định số tồn cuối cùng mà không kiểm tra dữ liệu
  hiện tại trên server.

### 5.6 Authentication và authorization

- Tài khoản inactive hoặc chưa xác minh không được tạo phiên hợp lệ.
- Session bị thu hồi phải làm token mất hiệu lực theo cơ chế xác thực hiện tại.
- Frontend ẩn nút không thay thế permission check ở backend.
- Activity Log không được chứa password, JWT, SMTP password hoặc API key.

## 6. Quyết định về SQL Server retry

### 6.1 Trạng thái hiện tại

Hệ thống **không bật `EnableRetryOnFailure()` toàn cục** trong
`AddDbContext`. Đây là quyết định có chủ đích, không phải thiếu sót.

Nhiều command của QuanLyNhaHang có thể:

- tạo đơn hoặc payment;
- cập nhật nhiều trạng thái nghiệp vụ;
- gửi email;
- ghi Activity Log;
- gọi dịch vụ bên ngoài trong tương lai.

Nếu execution strategy tự chạy lại toàn bộ thao tác sau một lỗi kết nối không rõ
kết quả, hệ thống có thể tạo payment, order hoặc side effect lần thứ hai. Retry
không có idempotency có thể làm reliability thấp hơn.

### 6.2 Điều kiện để bật retry trong tương lai

Chỉ xem xét bật lại khi đã có đầy đủ:

1. transaction được thực thi theo `CreateExecutionStrategy()` đúng hướng dẫn của
   EF Core;
2. payment và command nhạy cảm có idempotency key/unique constraint;
3. email và side effect bên ngoài được tách bằng Transactional Outbox;
4. handler không thực hiện side effect không thể hoàn tác trong vùng có thể retry;
5. integration test mô phỏng transient database fault;
6. test chứng minh retry không tạo hai order, payment, email hoặc log nghiệp vụ.

Kiến trúc mục tiêu:

```text
Command
  -> Execution Strategy
  -> Database Transaction
       -> cập nhật nghiệp vụ
       -> ghi Outbox Message
  -> Commit
  -> Outbox Worker gửi email/gọi dịch vụ ngoài
```

Trong phạm vi hiện tại, ưu tiên kiến trúc đơn giản, transaction rõ ràng, phát hiện
lỗi, readiness và phục hồi có kiểm soát.

## 7. Failure model

| Failure | Dấu hiệu | Kiểm soát hiện có | Hành động vận hành |
|---|---|---|---|
| API process dừng | `/health/live` không phản hồi | Restart policy của môi trường triển khai | Xem container log, restart và xác nhận live |
| SQL Server gián đoạn | live khỏe, ready lỗi | Database health check | Tạm ngừng thao tác ghi, kiểm tra database và xác nhận readiness sau phục hồi |
| Lỗi code không dự kiến | HTTP 500 có `traceId` | Global middleware, server log, CI/E2E | Tra log theo traceId, tạo issue và rollback nếu cần |
| Dữ liệu bị xóa/sai | Dữ liệu nghiệp vụ bất thường | Activity Log, permission, backup | Dừng ghi dữ liệu, backup hiện trạng, đánh giá sửa dữ liệu hoặc restore |
| Lộ/mất credential | Đăng nhập bất thường hoặc secret bị phát hiện | User Secrets/.env, CI secret guard, revoke session | Đổi secret, thu hồi phiên và kiểm tra Activity Log |
| Migration lỗi | API không ready hoặc schema sai | Migration trong source control và CI | Dừng deploy; không sửa tay tùy tiện; rollback ứng dụng hoặc restore |
| Request bị gửi lặp | Trùng đơn/payment/kitchen item | Validation hiện có; idempotency là hạng mục tiếp theo | Không retry mù; đối chiếu bản ghi và bổ sung idempotency cho luồng nhạy cảm |
| Sai thao tác người dùng | Đơn/bàn/bếp ở trạng thái không hợp lệ | Validation, permission, UI confirmation | Dùng Activity Log để truy vết và sửa theo quy trình |

## 8. Redundancy và diversity

### 8.1 Redundancy dữ liệu

Backup `.bak` là bản sao độc lập với database đang chạy. Script:

- chạy `BACKUP DATABASE ... WITH COPY_ONLY, CHECKSUM, COMPRESSION`;
- chạy `RESTORE VERIFYONLY ... WITH CHECKSUM`;
- chỉ sau khi verify thành công mới copy file ra máy host;
- xóa file tạm trong container.

Chạy backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1
```

Chọn thư mục đích:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1 `
  -OutputDirectory D:\RestaurantBackups
```

Khôi phục:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-database.ps1 `
  -BackupFile D:\RestaurantBackups\QuanLyNhaHang-20260805-230000.bak
```

Restore yêu cầu nhập lại chính xác tên database. `-Force` chỉ dành cho quy trình
tự động đã được kiểm soát.

Backup nằm cùng máy không bảo vệ trước lỗi ổ cứng, mất máy hoặc ransomware. Ít
nhất một bản phải được copy sang thiết bị/kho lưu trữ khác và quyền truy cập nên
tách khỏi tài khoản chạy ứng dụng.

### 8.2 Diversity trong xác nhận chất lượng

Dự án không chỉ dựa vào một loại test:

- unit test kiểm tra domain/handler độc lập;
- integration test kiểm tra API, auth, persistence và workflow;
- Playwright kiểm tra trình duyệt, JavaScript, request và bố cục thật;
- Docker smoke test kiểm tra image đã publish;
- code review và kiểm tra thủ công bổ sung góc nhìn khác với test tự động.

Sự đa dạng này giảm khả năng một lỗi chung bị bỏ sót bởi một kỹ thuật duy nhất.

### 8.3 Giới hạn redundancy hiện tại

Dự án vẫn là single API instance + single SQL Server instance. Chưa có:

- SQL Server Always On/replica;
- load balancer và nhiều API instance;
- vùng triển khai độc lập;
- tự động failover;
- backup tự động off-site.

Vì vậy không mô tả hệ thống là high availability.

## 9. Dependable development process

Quy trình đề xuất cho mọi thay đổi:

```text
Tạo branch
  -> triển khai chức năng
  -> unit test
  -> integration test
  -> build/static validation
  -> Docker smoke test
  -> code review
  -> merge
  -> migration/deploy
  -> health verification
```

Điều kiện merge tối thiểu:

- backend build thành công;
- unit test và integration test thành công;
- migration được kiểm tra khi có thay đổi schema;
- không có secret hoặc file cấu hình local bị commit;
- thay đổi nghiệp vụ có test cho happy path và failure path;
- thay đổi UI quan trọng có Playwright hoặc kiểm tra trình duyệt tương ứng;
- tài liệu vận hành được cập nhật nếu thay đổi health, backup, deploy hoặc
  dependency bên ngoài;
- không merge khi CI còn đỏ.

## 10. Sociotechnical system và trách nhiệm vận hành

Dependability không chỉ đến từ code. Hệ thống gồm:

| Lớp | Thành phần |
|---|---|
| Hạ tầng | Máy chạy Docker, ổ đĩa, mạng |
| Nền tảng | Windows/Linux, Docker, .NET |
| Dữ liệu | SQL Server, migration, backup |
| Ứng dụng | ASP.NET Core API, React, CQRS handlers |
| Dịch vụ ngoài | SMTP/Mailpit và dịch vụ thanh toán nếu tích hợp |
| Quy trình | Tạo đơn, bếp, thanh toán, đặt bàn, tồn kho |
| Con người | Admin, quản lý, thu ngân, nhân viên, bếp |
| Tổ chức | Phân quyền, backup, triển khai và xử lý sự cố |

Trách nhiệm baseline:

- **Developer:** sửa lỗi, viết test, giữ migration và tài liệu đồng bộ;
- **Người triển khai:** quản lý secret, chạy migration, kiểm tra health;
- **Quản trị hệ thống:** backup, restore drill, quản lý quyền và xử lý incident;
- **Người dùng nghiệp vụ:** xác nhận thao tác nhạy cảm và báo lỗi kèm thời gian,
  tài khoản, mã đơn và `traceId` nếu có.

## 11. Runbook xử lý sự cố

### 11.1 SQL Server không hoạt động

1. Kiểm tra `/health/live`.
2. Kiểm tra `/health/ready`.
3. Kiểm tra trạng thái container/process SQL Server và dung lượng đĩa.
4. Tạm ngừng thao tác ghi dữ liệu; không gửi lại command liên tục.
5. Xem log database và API theo thời điểm lỗi.
6. Khởi động/phục hồi database theo quy trình được kiểm soát.
7. Xác nhận `/health/ready` khỏe trở lại.
8. Kiểm tra một luồng đọc và một luồng ghi không phá hủy dữ liệu.
9. Ghi lại thời gian, nguyên nhân và hành động đã thực hiện.

### 11.2 Thanh toán có trạng thái không rõ

1. Không tự động gửi lại vô hạn.
2. Tra cứu payment theo mã giao dịch/idempotency key.
3. Đối chiếu trạng thái từ nhà cung cấp thanh toán nếu có.
4. Kiểm tra Order, Invoice và Payment trong database.
5. Chỉ cập nhật trạng thái sau khi xác định được kết quả.
6. Mọi sửa thủ công phải có Activity Log và người chịu trách nhiệm.

### 11.3 Phát hiện secret bị lộ

1. Thu hồi hoặc đổi secret ngay.
2. Thu hồi các session/token liên quan.
3. Kiểm tra lịch sử commit và CI secret guard.
4. Kiểm tra Activity Log và đăng nhập bất thường.
5. Xóa secret khỏi lịch sử theo quy trình Git nếu cần; chỉ xóa file hiện tại là
   chưa đủ.
6. Ghi nhận incident và nguyên nhân gốc.

### 11.4 Restore database

1. Dừng hoặc cô lập các thao tác ghi.
2. Backup hiện trạng trước khi restore nếu còn khả năng.
3. Chọn đúng file backup và xác nhận thời điểm dữ liệu.
4. Chạy `RESTORE VERIFYONLY`.
5. Thực hiện restore bằng script; không bỏ qua bước xác nhận khi làm thủ công.
6. Xác nhận database trở về `MULTI_USER`.
7. Chạy health check, kiểm tra migration và các invariant chính.
8. Ghi lại RPO/RTO thực tế của lần diễn tập.

## 12. Formal methods ở mức phù hợp

Dự án không sử dụng theorem prover hoặc đặc tả toán học cho toàn bộ hệ thống.
Cách áp dụng phù hợp hơn là:

- state machine cho Order/Kitchen/Reservation;
- invariant biểu diễn bằng điều kiện rõ ràng;
- database unique/check/foreign-key constraint;
- parameterized hoặc property-based test cho nhiều tổ hợp dữ liệu;
- traceability từ yêu cầu dependability đến test.

Ví dụ property cần duy trì:

```text
Order.TotalAmount >= 0
OrderItem.Quantity > 0
Payment.Amount > 0
PaidAmount <= AmountDue
InventoryQuantity >= 0
```

Formal specification đầy đủ chỉ nên xem xét cho một kernel nghiệp vụ thật sự
quan trọng khi lợi ích vượt chi phí đào tạo, công cụ và bảo trì.

## 13. Giới hạn và công việc tiếp theo

Các giới hạn hiện tại:

- single API instance và single SQL Server instance;
- chưa có monitoring/alerting production;
- chưa tự động chạy backup theo lịch và copy off-site;
- chưa có Transactional Outbox;
- chưa có idempotency đầy đủ cho mọi command nhạy cảm;
- chưa có fault injection cho mất kết nối database;
- chưa có formal verification hoặc model checking;
- mục tiêu availability/RPO/RTO chưa được chứng minh bằng số liệu vận hành dài
  hạn.

Thứ tự ưu tiên tiếp theo:

1. hoàn thiện integration test cho invariant Order, Payment, Kitchen và Inventory;
2. thêm idempotency cho payment và các request có nguy cơ gửi lặp;
3. triển khai Transactional Outbox cho email/side effect bên ngoài;
4. tự động hóa backup và restore drill;
5. bổ sung monitoring, alerting và dashboard sự cố;
6. chỉ sau đó mới đánh giá lại SQL Server execution retry.

## 14. Checklist nghiệm thu Chapter 10

- [x] Tách liveness và readiness.
- [x] Readiness kiểm tra SQL Server.
- [x] Exception không dự kiến trả HTTP 500 an toàn và có `traceId`.
- [x] Có script backup/restore với checksum và verify.
- [x] Có baseline availability, RPO và RTO.
- [x] Có failure model và runbook xử lý sự cố.
- [x] Có nhiều lớp verification/validation trong CI và test suite.
- [x] Có đặc tả invariant và state transition nghiệp vụ.
- [x] Ghi rõ giới hạn single-instance và chưa high availability.
- [x] Không bật retry SQL toàn cục khi chưa có idempotency/outbox.
- [ ] Tự động hóa backup off-site và diễn tập restore định kỳ.
- [ ] Hoàn thiện idempotency cho payment/command nhạy cảm.
- [ ] Triển khai Transactional Outbox.
- [ ] Bổ sung fault injection và đo availability/RPO/RTO thực tế.

## 15. Kết luận

Việc áp dụng Chapter 10 vào QuanLyNhaHang tập trung vào khả năng tin cậy của toàn
bộ hệ thống, không chỉ vào việc API có chạy hay không. Hệ thống được xem xét qua
availability, reliability, safety, security và resilience, đồng thời xét cả database,
hạ tầng, người vận hành và quy trình nghiệp vụ.

Giải pháp hiện tại ưu tiên cơ chế có thể kiểm tra và phục hồi có kiểm soát:
health check, error handling an toàn, backup/restore, test đa dạng, CI, Activity
Log, invariant nghiệp vụ và runbook. Các cơ chế phức tạp như retry tự động chỉ
được đưa vào khi đã có idempotency và Outbox để tránh chính cơ chế phục hồi tạo
ra lỗi lặp nghiệp vụ.
