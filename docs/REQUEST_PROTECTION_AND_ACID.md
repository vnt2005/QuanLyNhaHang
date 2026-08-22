# Chống spam request và bảo đảm ACID

## Mục tiêu

Các luồng tạo đơn, thêm món, đặt bàn và thanh toán được bảo vệ theo nhiều lớp:

1. Rate limit chặn lưu lượng lặp quá mức theo tài khoản, mã thiết bị hoặc IP.
2. `Idempotency-Key` biến thao tác gửi lại thành cùng một kết quả thay vì tạo dữ liệu lần hai.
3. Transaction `Serializable` gom toàn bộ thay đổi quan trọng thành một lần commit hoặc rollback.
4. Unique index, foreign key, check constraint và `rowversion` bảo vệ tính nhất quán ngay tại SQL Server.
5. Thông báo SignalR chỉ được phát sau khi transaction commit thành công.

Các quyết định này dựa trên tài liệu chính thức:

- [ASP.NET Core rate limiting middleware](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)
- [EF Core transactions](https://learn.microsoft.com/en-us/ef/core/saving/transactions)
- [EF Core optimistic concurrency](https://learn.microsoft.com/en-us/ef/core/saving/concurrency)
- [SQL Server transaction isolation](https://learn.microsoft.com/en-us/sql/t-sql/statements/set-transaction-isolation-level-transact-sql)
- [IETF Idempotency-Key draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)
- [OWASP API4: Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- [OWASP API6: Unrestricted Access to Sensitive Business Flows](https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/)

## Hợp đồng request

Frontend gửi hai header sau cho các thao tác `POST`:

```http
X-Client-Id: <UUID ổn định của trình duyệt>
Idempotency-Key: <UUID riêng của lần bấm gửi>
```

`Idempotency-Key` phải dài 8–128 ký tự và chỉ gồm chữ, số, `.`, `_`, `-`.

- Cùng actor + scope + key + nội dung: API phát lại nguyên status/body đã commit và trả header `Idempotency-Replayed: true`.
- Cùng key nhưng nội dung khác: API trả `409 Conflict`.
- Request đang được xử lý: API trả `409` và `Retry-After: 1`.
- Client ẩn danh cũ chưa gửi key: API tự tạo key từ dấu vân tay request trong cửa sổ 10 giây; riêng webhook là 120 giây.
- Request đã đăng nhập nhưng không gửi key vẫn chạy trong transaction, nhưng không được hợp nhất theo nội dung để tránh chặn một thao tác hợp lệ sau khi trạng thái nghiệp vụ vừa thay đổi.
- Key do client gửi được giữ 24 giờ. Bản ghi hết hạn được dọn mỗi 15 phút.

## Hạn mức hiện tại

| Luồng | Chủ thể | Hạn mức |
|---|---|---:|
| Tạo đơn/gọi món | khách ẩn danh | 6/phút |
| Tạo đơn/gọi món | đã đăng nhập | 30/phút |
| Sửa trạng thái/món trong đơn | đã đăng nhập | 60/phút |
| Đặt bàn | khách ẩn danh | 3/10 phút |
| Đặt bàn | đã đăng nhập | 30/10 phút |
| Sửa/hủy đặt bàn | đã đăng nhập | 60/phút |
| Tạo/hủy thanh toán QR | khách ẩn danh | 5/5 phút |
| Thao tác thanh toán | đã đăng nhập | 20/5 phút |
| Webhook SePay | IP nhà cung cấp | 240/phút |
| Xem menu/trạng thái QR | tài khoản/thiết bị/IP | 60/phút |

Toàn API còn có trần 300 request/phút/IP, tối đa 50 request đồng thời/IP và giới hạn request body 1 MiB.

Khi vượt hạn mức, API trả `429 Too Many Requests`, header `Retry-After` và JSON Problem Details.

Rate limiter ASP.NET Core lưu bộ đếm trong tiến trình. Nếu triển khai nhiều API instance, cần áp cùng quota tại API gateway/reverse proxy hoặc dùng distributed limiter. Idempotency record và unique index nằm trong SQL Server nên vẫn chống tạo trùng giữa các instance.

## Cách ACID được áp dụng

### Atomicity

- Các endpoint tạo/sửa đơn, món, đặt bàn và thanh toán chạy trong transaction.
- Transaction chỉ commit với HTTP `2xx`/`3xx`; phản hồi lỗi hoặc exception sẽ rollback.
- Response được buffer cho đến sau commit.
- Thông báo realtime được lưu cùng transaction và chỉ phát SignalR sau commit.

### Consistency

- Foreign key bảo vệ quan hệ Order, OrderItem, Payment, Invoice, InvoiceItem, Reservation và RestaurantTable.
- Check constraint chặn số lượng, sức chứa và số tiền âm; kiểm tra thành tiền.
- Unique index chặn một đơn có nhiều payment `Paid`, nhiều invoice còn hiệu lực cho một payment, nhiều payment attempt đang mở, hoặc xử lý trùng mã giao dịch nhà cung cấp.

### Isolation

- Các luồng nghiệp vụ quan trọng dùng `Serializable` để ngăn hai request cùng đọc trạng thái cũ rồi đồng thời ghi kết quả xung đột.
- `rowversion` trên các aggregate quan trọng giúp EF Core phát hiện cập nhật đồng thời và trả `409 Conflict` thay vì âm thầm ghi đè.

### Durability

- Kết quả chỉ được trả cho client sau khi SQL Server commit.
- Idempotency response được lưu trong cùng transaction với dữ liệu nghiệp vụ.

## Triển khai migration

1. Sao lưu database.
2. Chạy `scripts/preflight-acid.sql`. Mọi result set phải không có dòng dữ liệu lỗi.
3. Dừng tạm các thao tác ghi trong lúc cập nhật schema.
4. Chạy:

```bash
dotnet ef database update \
  --project QuanLyNhaHang.Infrastructure \
  --startup-project QuanLyNhaHang.Api
```

5. Khởi động API và kiểm tra `/health/ready`.
6. Kiểm thử gửi hai request giống nhau với cùng `Idempotency-Key`; request thứ hai phải có `Idempotency-Replayed: true` và database chỉ có một bản ghi nghiệp vụ.

Không tự động xóa hoặc sửa dữ liệu cũ vi phạm constraint trong migration. Nếu preflight phát hiện lỗi, cần đối soát nghiệp vụ và sửa dữ liệu trước khi chạy migration.
