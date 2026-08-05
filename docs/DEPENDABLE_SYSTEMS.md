# Chương 10 – Dependable Systems

Tài liệu này đối chiếu hệ thống **QuanLyNhaHang** với Chương 10 –
*Dependable systems* trong *Software Engineering, 10th Edition* của Ian
Sommerville.

Mục tiêu không phải tuyên bố hệ thống đã đạt mức sẵn sàng sản xuất cao, mà là:

- xác định rõ mức độ đáng tin cậy hiện tại;
- biến các thuộc tính mơ hồ thành yêu cầu có thể kiểm tra;
- bổ sung cơ chế phát hiện lỗi, phục hồi dữ liệu và quy trình vận hành;
- ghi nhận những phần còn thiếu để tiếp tục ở Chương 11–14.

## 1. Kết luận kiểm tra repository

Trước nhánh `agent/chapter-10-dependability`, dự án **đã làm đúng một phần**
Chương 10 nhưng chưa thể xem là hoàn thành.

Điểm đã có:

- Clean Architecture, CQRS và phân tách dependency rõ ràng;
- JWT, phiên đăng nhập có thể thu hồi, RBAC/permission, CORS và rate limit;
- Activity Log cho thao tác nghiệp vụ;
- unit test, integration test, Playwright E2E, Docker smoke test và CI;
- SQL Server dùng volume bền vững, container tự khởi động lại;
- endpoint `/health` kiểm tra tiến trình API.

Khoảng trống chính:

- `/health` cũ luôn trả `Healthy`, không biết SQL Server có sử dụng được hay không;
- chưa tách **liveness** và **readiness**;
- chưa retry lỗi kết nối SQL Server tạm thời;
- lỗi không dự kiến bị trả HTTP 400 và lộ trực tiếp nội dung exception;
- chưa có quy trình backup/restore được kiểm tra bằng checksum;
- chưa có mục tiêu RPO/RTO, vai trò vận hành hoặc quy trình xử lý sự cố;
- chưa mô tả rõ các invariant nghiệp vụ và chưa có bằng chứng formal
  verification.

Vì vậy, đánh giá trước khi sửa là **mức cơ sở khá, nhưng mới đạt một phần của
Chương 10**.

## 2. Đối chiếu theo từng mục của Chương 10

| Mục | Hiện trạng sau nhánh này | Đánh giá |
|---|---|---|
| 10.1 Dependability properties | Có kiểm thử, bảo mật, liveness/readiness, phản hồi lỗi an toàn và mục tiêu phục hồi | Đạt mức cơ sở |
| 10.2 Sociotechnical systems | Có vai trò nghiệp vụ và bổ sung trách nhiệm vận hành, checklist triển khai/sự cố | Đạt một phần |
| 10.3 Redundancy and diversity | Có backup độc lập khỏi database đang chạy và nhiều lớp kiểm thử; chưa có SQL replica/API nhiều instance | Đạt một phần |
| 10.4 Dependable processes | PR, CI, unit/integration/E2E, secret guard, migration và runbook | Khá tốt cho đồ án |
| 10.5 Formal methods and dependability | Có invariant được đặc tả bằng văn bản và domain guard; chưa có mô hình/proof chính quy | Chưa hoàn chỉnh |

## 3. Thuộc tính dependability của hệ thống

### 3.1 Availability – tính sẵn sàng

Hệ thống cung cấp ba endpoint:

| Endpoint | Ý nghĩa | Có phụ thuộc database |
|---|---|---|
| `GET /health` | Alias tương thích cho liveness | Không |
| `GET /health/live` | Tiến trình API còn sống và có thể phản hồi HTTP | Không |
| `GET /health/ready` | API sẵn sàng nhận nghiệp vụ | Có, kiểm tra SQL Server |

Nguyên tắc:

- liveness không được thất bại chỉ vì database đang tạm gián đoạn; nếu không,
  nền tảng có thể restart API liên tục dù tiến trình vẫn tốt;
- readiness phải trả trạng thái không khỏe khi database không kết nối được để
  load balancer hoặc người vận hành ngừng chuyển request nghiệp vụ vào instance;
- response health là JSON, gồm trạng thái chung, thời gian thực thi và từng
  dependency, nhưng không trả exception nội bộ.

### 3.2 Reliability – tính tin cậy

Các biện pháp hiện có:

- validation và domain guard trong command handler/entity;
- transaction của EF Core cho mỗi lần `SaveChanges`;
- unit test, integration test và luồng trình duyệt thật bằng Playwright;
- CI build backend, test, Docker image và smoke test;
- SQL Server execution strategy retry tối đa 5 lần, khoảng chờ tối đa 10 giây
  cho lỗi tạm thời.

Retry chỉ phù hợp với lỗi tạm thời. Retry không thay thế validation, transaction,
idempotency hoặc xử lý xung đột đồng thời.

### 3.3 Safety – an toàn

QuanLyNhaHang không điều khiển thiết bị có thể gây thương tích nên không phải
safety-critical system theo nghĩa y tế, hàng không hoặc công nghiệp.

Trong phạm vi hệ thống nhà hàng, “an toàn” được hiểu là tránh hậu quả nghiệp vụ:

- không tính tiền âm hoặc sai tổng tiền;
- không thanh toán lặp;
- không làm mất đơn đang phục vụ;
- không chuyển sai bàn hoặc sai trạng thái bếp;
- không cho tài khoản bị khóa/chưa xác minh tiếp tục sử dụng phiên cũ;
- không để lỗi kỹ thuật làm lộ bí mật hoặc dữ liệu nội bộ.

### 3.4 Security – bảo mật

Các lớp bảo vệ đã có:

- JWT kiểm tra issuer, audience, lifetime và signing key;
- token phải gắn với session còn hoạt động;
- tài khoản phải active và đã xác minh email;
- permission policy ở backend, không chỉ ẩn nút frontend;
- rate limit cho đăng nhập, chức năng xác thực nhạy cảm và QR order;
- CORS theo danh sách origin;
- CI từ chối `.env` và `appsettings` chứa bí mật bị commit;
- Activity Log và thu hồi phiên khi thay đổi tài khoản nhạy cảm.

Nhánh này bổ sung quy tắc: exception không dự kiến trả HTTP 500 với thông báo
chung và `traceId`; nội dung exception thật chỉ nằm trong log server.

### 3.5 Maintainability – khả năng bảo trì

Clean Architecture, CQRS, tài liệu kiến trúc, migration, test tự động và quy tắc
PR giúp thay đổi hệ thống có thể kiểm soát. Đây là thuộc tính hỗ trợ trực tiếp cho
reliability vì lỗi có thể được tìm, sửa và xác nhận nhanh hơn.

## 4. Yêu cầu dependability có thể kiểm tra

Các mục tiêu dưới đây là baseline kỹ thuật cho môi trường đồ án/demo. Chúng chưa
phải SLA thương mại và phải được chủ hệ thống phê duyệt trước khi production.

| ID | Yêu cầu | Cách xác nhận |
|---|---|---|
| DEP-AV-001 | Liveness trả HTTP 200 khi tiến trình API hoạt động, kể cả lúc database không sẵn sàng | Integration test và Docker smoke test |
| DEP-AV-002 | Readiness kiểm tra cả API và SQL Server; dependency lỗi làm readiness không khỏe | Integration test và thử dừng container database |
| DEP-REL-001 | Kết nối SQL Server retry lỗi tạm thời tối đa 5 lần, delay tối đa 10 giây | Cấu hình EF Core và log khi fault injection |
| DEP-ERR-001 | Exception không dự kiến trả HTTP 500, không lộ message nội bộ và có `traceId` | Middleware test |
| DEP-REC-001 | File backup dùng `CHECKSUM` và phải qua `RESTORE VERIFYONLY` trước khi được báo thành công | `scripts/backup-database.ps1` |
| DEP-REC-002 | Restore phải xác nhận rõ, verify backup trước, đưa database về `MULTI_USER` sau thao tác | `scripts/restore-database.ps1` và restore drill |
| DEP-PRO-001 | Mọi thay đổi phải build và qua unit/integration test; thay đổi UI quan trọng phải qua Playwright | GitHub Actions |
| DEP-SEC-001 | Tài khoản inactive/chưa verify hoặc session bị thu hồi không được xác thực | Integration test auth/session |
| DEP-AUD-001 | Command nghiệp vụ quan trọng phải để lại Activity Log không chứa secret | ActivityLog behavior và test |

Mục tiêu vận hành ban đầu:

- availability mục tiêu: **99,5% trong giờ nhà hàng hoạt động**;
- RPO mục tiêu: **24 giờ** khi thực hiện backup hằng ngày;
- RTO mục tiêu: **2 giờ** cho môi trường một máy/Docker;
- backup giữ tối thiểu 7 bản ngày gần nhất và ít nhất một bản nằm ngoài máy
  chạy database.

Các con số trên chỉ đạt được khi backup được chạy và restore được diễn tập. Nếu
không có lịch backup, RPO thực tế là không xác định.

## 5. Failure model

| Failure | Dấu hiệu | Kiểm soát hiện có | Hành động vận hành |
|---|---|---|---|
| API process dừng | `/health/live` không phản hồi | Docker restart policy | Xem container log, restart và xác nhận live |
| SQL Server tạm gián đoạn | live khỏe, ready lỗi | DB health check và transient retry | Không nhận thao tác mới, kiểm tra database |
| Lỗi code không dự kiến | HTTP 500 có `traceId` | Global middleware, server log, CI/E2E | Tra log theo traceId, tạo issue và rollback nếu cần |
| Dữ liệu bị xóa/sai do thao tác | Dữ liệu nghiệp vụ bất thường | Activity Log, permission, backup | Dừng ghi dữ liệu, backup hiện trạng, đánh giá restore |
| Lộ/mất credential | Đăng nhập bất thường hoặc secret bị phát hiện | User Secrets/.env, CI secret-file guard, revoke session | Đổi secret, thu hồi phiên, kiểm tra Activity Log |
| Migration lỗi | API không sẵn sàng hoặc schema không đúng | Migration trong source control và CI | Không sửa tay tùy tiện; rollback ứng dụng hoặc restore |
| Sai thao tác người dùng | Đơn/bàn/bếp ở trạng thái không hợp lệ | validation, permission, UI confirmation | Dùng Activity Log để truy vết và sửa theo quy trình |

## 6. Redundancy và diversity

### 6.1 Redundancy dữ liệu

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

Restore sẽ yêu cầu nhập lại chính xác tên database. `-Force` chỉ dành cho quy
trình tự động đã được kiểm soát.

Backup nằm cùng máy không bảo vệ trước lỗi ổ cứng, mất máy hoặc ransomware. Ít
nhất một bản phải được copy sang thiết bị/kho lưu trữ khác và quyền truy cập phải
tách khỏi tài khoản chạy ứng dụng.

### 6.2 Diversity trong xác nhận chất lượng

Dự án không chỉ dựa vào một loại test:

- unit test kiểm tra domain/handler độc lập;
- integration test kiểm tra API, auth, persistence và workflow;
- Playwright kiểm tra trình duyệt, JavaScript, request và bố cục thật;
- Docker smoke test kiểm tra image đã publish có khởi động được;
- kiểm tra thủ công được dùng cho trải nghiệm thị giác và quy trình vận hành.

Sự đa dạng này giảm khả năng một lỗi chung bị bỏ sót bởi một kỹ thuật duy nhất.

### 6.3 Phần chưa có

Dự án hiện vẫn là single API instance + single SQL Server instance. Chưa có:

- SQL Server Always On/replica;
- load balancer và nhiều API instance;
- vùng triển khai độc lập;
- tự động failover;
- backup tự động off-site.

Không được mô tả hệ thống là high availability trước khi các phần này được triển
khai và kiểm thử.

## 7. Sociotechnical system và trách nhiệm con người

Dependability không chỉ nằm trong code. Hệ thống gồm nhân viên, quản lý, quy
trình nhà hàng, thiết bị, mạng, database và phần mềm.

| Vai trò | Trách nhiệm dependability |
|---|---|
| Chủ hệ thống/Admin | Phê duyệt quyền, lịch backup, restore và xử lý sự cố lớn |
| Developer | Thay đổi qua branch/PR, bảo trì test, migration, log và tài liệu |
| Manager | Xác nhận nghiệp vụ sau thay đổi, báo cáo sai lệch dữ liệu |
| Cashier/Staff/Kitchen | Dùng đúng quyền, không chia sẻ tài khoản, báo lỗi kèm thời gian/mã đơn |
| Người thực hiện restore | Dừng ghi dữ liệu, lưu backup hiện trạng, ghi lại file/thời điểm/kết quả restore |

Không cấp quyền database trực tiếp cho tài khoản nghiệp vụ. Không restore chỉ vì
một bản ghi sai khi lỗi có thể sửa có kiểm soát; restore toàn database có thể làm
mất mọi thay đổi sau thời điểm backup.

## 8. Dependable process

### Trước khi merge

1. Xác định ảnh hưởng tới dữ liệu, permission, trạng thái đơn/bếp/thanh toán.
2. Bổ sung hoặc cập nhật test tái hiện rủi ro.
3. Không commit secret hoặc cấu hình local.
4. Build và chạy test liên quan.
5. Mở PR mô tả nguyên nhân, invariant bị ảnh hưởng và cách rollback.
6. Chỉ merge khi các workflow bắt buộc thành công.

### Trước khi triển khai thay đổi schema/nghiệp vụ lớn

1. Tạo backup và lưu đường dẫn file.
2. Xác nhận `RESTORE VERIFYONLY` thành công.
3. Ghi lại commit/tag đang chạy.
4. Kiểm tra migration sinh ra đúng thay đổi mong muốn.
5. Chọn thời điểm ít giao dịch.
6. Sau triển khai, kiểm tra `/health/live`, `/health/ready` và workflow chính.

### Khi xảy ra sự cố

1. Ghi thời gian, tài khoản, màn hình, mã đơn/bàn và `traceId` nếu có.
2. Hạn chế thao tác mới nếu dữ liệu có nguy cơ tiếp tục sai.
3. Kiểm tra health, container log và Activity Log.
4. Phân loại: lỗi tiến trình, dependency, code, dữ liệu hay thao tác người dùng.
5. Ưu tiên rollback ứng dụng nếu schema còn tương thích.
6. Chỉ restore database sau khi đánh giá phần dữ liệu sẽ mất theo RPO.
7. Sau phục hồi, xác nhận readiness và các luồng đăng nhập → đơn → bếp → thanh
   toán → hóa đơn.
8. Ghi lại nguyên nhân gốc và thêm regression test.

## 9. Formal methods và invariant nghiệp vụ

Dự án chưa dùng ngôn ngữ đặc tả hình thức hoặc proof assistant. Vì vậy mục 10.5
chưa hoàn chỉnh. Baseline hiện tại là đặc tả invariant rõ ràng, domain guard,
database constraint và test.

Các invariant phải được giữ khi sửa chức năng:

1. tiền, số lượng và tổng tiền không âm;
2. một payment thành công không được tạo nhiều invoice cho cùng nghiệp vụ;
3. trạng thái hoàn tất/hủy không được tự quay lại trạng thái đang xử lý;
4. món bếp đã hoàn tất không được quay ngược về chờ bếp;
5. bàn đích của chuyển/gộp/tách phải hoạt động, trống và khác bàn nguồn;
6. tài khoản inactive/chưa verify hoặc session bị thu hồi không được xác thực;
7. role/permission hệ thống không được làm mất Admin hoạt động cuối cùng;
8. thay đổi trạng thái liên quan nhiều aggregate phải thành công toàn bộ hoặc
   không thay đổi gì.

Hướng tiếp theo là biểu diễn các workflow quan trọng thành state machine và sinh
test cho toàn bộ transition hợp lệ/không hợp lệ.

## 10. Phần còn phải tiếp tục

Để hoàn thành Chương 10 ở mức mạnh hơn, thực hiện theo thứ tự:

1. lập lịch backup tự động và retention; copy ít nhất một bản off-host;
2. chạy restore drill định kỳ và lưu bằng chứng thời gian phục hồi;
3. thêm metrics/alert cho readiness, HTTP 5xx, latency và lỗi database;
4. thêm optimistic concurrency cho dữ liệu dễ bị nhiều nhân viên sửa đồng thời;
5. thêm idempotency cho thanh toán và tạo đơn từ QR;
6. xem xét outbox cho thao tác cần đồng bộ nhiều bước;
7. mô hình hóa state machine của Order/Kitchen/Payment/Invoice/TableOperation;
8. khi có nhu cầu production thật, thiết kế nhiều API instance và SQL high
   availability thay vì chỉ dựa vào restart/backup.

Nhánh này hoàn thành **baseline triển khai của Chương 10**, nhưng không che giấu
các giới hạn: dự án chưa phải hệ thống HA, chưa có formal proof và chưa có backup
tự động off-site.
