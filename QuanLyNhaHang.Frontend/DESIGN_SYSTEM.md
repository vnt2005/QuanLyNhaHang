# Design System — Quản Lý Nhà Hàng Admin

Design System này dùng code làm nguồn chuẩn, không phụ thuộc Figma hoặc một gói UI trả phí. Mục tiêu là giữ toàn bộ nghiệp vụ hiện có nhưng tạo trải nghiệm nhất quán cho màn hình quản trị nhiều dữ liệu tại 1440×900 và 1366×768.

## Định hướng

- **Enterprise-first:** luồng thao tác rõ ràng, phân cấp hành động chính/phụ/nguy hiểm.
- **Data-first:** bảng, bộ lọc, phân trang và trạng thái có cùng cấu trúc thị giác.
- **Readable density:** giao diện gọn nhưng không dùng chữ nội dung nhỏ hơn 12px.
- **Semantic tokens:** code tính năng dùng vai trò như `--ds-color-text` hoặc `--ds-color-danger`, không dùng mã màu rời rạc.
- **Accessible by default:** focus rõ, control cao tối thiểu 32–40px, màu không phải tín hiệu trạng thái duy nhất, hỗ trợ reduced motion.

Hướng thiết kế tham khảo các pattern enterprise của [Ant Design](https://ant.design/docs/spec/introduce/), bảng dữ liệu của [Carbon](https://carbondesignsystem.com/components/data-table/usage/), semantic token và accessibility của [Fluent 2](https://fluent2.microsoft.design/design-tokens), cùng hệ sinh thái component React của [Material UI](https://mui.com/material-ui/getting-started/).

## Cấu trúc code

```text
src/design-system/
├── tokens.css   # primitive palette, semantic aliases, spacing, type, radius, shadow
└── admin.css    # app shell và contract giao diện dùng chung cho các module
```

`tokens.css` được nạp trước CSS tính năng. `admin.css` được nạp cuối để đồng bộ các màn hình cũ trong giai đoạn chuyển đổi mà không thay đổi logic React hoặc API.

## Foundation

| Nhóm      | Quy ước                                                          |
| --------- | ---------------------------------------------------------------- |
| Brand     | Blue cho hành động chính, teal cho điểm nhấn vận hành            |
| Neutral   | Navy sidebar, nền xám xanh rất nhạt, surface trắng               |
| Status    | Success, warning, danger và info có đủ text/surface/border token |
| Spacing   | Lưới 4px; khoảng cách thông dụng 8, 12, 16, 20, 24, 32px         |
| Radius    | 8px control, 12px card nhỏ, 16px panel/modal                     |
| Type      | Inter/system sans; nội dung 13–14px; label phụ tối thiểu 11–12px |
| Elevation | Shadow nhẹ cho panel, vừa cho popover, mạnh cho modal            |

Ví dụ dùng token:

```css
.feature-card {
  padding: var(--ds-space-5);
  color: var(--ds-color-text);
  border: 1px solid var(--ds-color-border);
  border-radius: var(--ds-radius-md);
  background: var(--ds-color-surface);
  box-shadow: var(--ds-shadow-xs);
}
```

## Component contract

### Button

- Hành động chính: `.primary-button` hoặc biến thể module đã được map trong `admin.css`.
- Hành động phụ: nền trắng, border neutral.
- Hành động nguy hiểm: text/border danger; chỉ chuyển nền đỏ khi hover hoặc xác nhận.
- Một cụm thao tác chỉ nên có một primary button.

### Form

- Label đặt trên control, dùng câu ngắn và nhất quán.
- Input/select cao 40px; textarea có thể thay đổi chiều cao theo trục dọc.
- Focus dùng cùng blue ring; thông báo lỗi nằm sát field hoặc đầu modal.

### Data table

- Header có surface subtle và sticky khi vùng chứa cuộn.
- Row cao tối thiểu khoảng 56px, hover nhẹ để quét theo hàng.
- Cột hành động dùng button nhỏ 32px; thao tác nguy hiểm luôn có màu danger.
- Pagination nằm dưới table và dùng cùng component contract giữa các module.

### Status

- Badge có text, không biểu đạt chỉ bằng màu.
- Success: đang hoạt động/đã hoàn tất/đã thanh toán.
- Warning: đang chờ/đang xử lý/sắp hết hạn.
- Danger: đã hủy/khóa/hết hạn/thất bại.
- Info: trạng thái trung tính hoặc đang đồng bộ.

### Modal

- Kích thước mặc định tối đa 832px và 90vh.
- Header sticky, nội dung cuộn, action nằm cuối form.
- Trên màn hình hẹp, action xếp dọc và primary nằm ở vị trí dễ bấm.

## Điều hướng Admin

Sidebar được chia theo ngữ cảnh công việc nhưng vẫn dùng permission hiện có:

1. Tổng quan
2. Khách hàng & đội ngũ
3. Kiểm soát
4. Vận hành
5. Sản phẩm
6. Hệ thống

Nhóm chỉ được tạo từ các mục người dùng có quyền xem, vì vậy không xuất hiện nhóm rỗng.

## Quy tắc mở rộng

1. Ưu tiên token semantic trước primitive token.
2. Tái sử dụng class contract hiện có trước khi tạo một kiểu button/table/modal mới.
3. Không thêm font-size dưới `--ds-font-size-2xs` cho nội dung có ý nghĩa.
4. Mọi control mới phải có trạng thái hover, focus-visible, disabled và error nếu áp dụng.
5. Kiểm tra tối thiểu ở 1440×900, 1366×768 và breakpoint 900px.

## Checklist review

- Không thay đổi permission, endpoint hoặc payload.
- Tab order hợp lý và focus ring không bị cắt.
- Bảng dài vẫn cuộn được và header không che nội dung.
- Trạng thái có text dễ hiểu ngoài màu sắc.
- Modal không vượt quá viewport.
- Không còn chữ nghiệp vụ 7–10px trong dashboard.
