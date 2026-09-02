using System.Text.Json;
using QuanLyNhaHang.Application.Features.AiAssistant;

namespace QuanLyNhaHang.Infrastructure.AI;

internal static class AiToolRegistry
{
    public static IReadOnlyList<JsonElement> GetCustomerToolDeclarations(bool authenticated)
    {
        var declarations = new List<JsonElement>
        {
            Tool(
                AiAssistantToolNames.RestaurantInfo,
                "Lấy thông tin nhà hàng, giờ mở/đóng cửa, VAT, phí phục vụ, địa chỉ, liên hệ, khu vực và trạng thái bàn hiện tại. BẮT BUỘC dùng khi khách hỏi các cấu hình này.",
                new { type = "object", properties = new { } }),
            Tool(
                AiAssistantToolNames.PaymentOptions,
                "Lấy danh mục phương thức thanh toán mà hệ thống hỗ trợ, tách rõ thanh toán trên CustomerWeb và tại quầy, đồng thời kiểm tra kênh QR SePay hiện có sẵn hay không. BẮT BUỘC dùng khi khách hỏi nhà hàng nhận thanh toán bằng gì, tiền mặt, thẻ, chuyển khoản, QR, ví điện tử, MoMo hoặc ZaloPay.",
                new { type = "object", properties = new { } }),
            Tool(
                AiAssistantToolNames.SearchMenu,
                "Tìm dữ liệu thực đơn trực tiếp trong hệ thống theo tên món, mô tả, giá hoặc danh mục. BẮT BUỘC dùng cho câu hỏi về món/thực đơn/giá. Chỉ trả món đang hoạt động; mặc định ưu tiên món đang bán.",
                new
                {
                    type = "object",
                    properties = new
                    {
                        query = new { type = "string", description = "Từ khóa tên món hoặc mô tả. Có thể để trống để lấy danh sách món." },
                        category = new { type = "string", description = "Tên danh mục nếu khách hỏi theo nhóm món." },
                        onlyAvailable = new { type = "boolean", description = "true để chỉ lấy món đang bán; mặc định true." },
                        limit = new { type = "integer", description = "Số món tối đa, từ 1 đến 30." }
                    }
                }),
            Tool(
                AiAssistantToolNames.ActivePromotions,
                "Lấy mã khuyến mãi đang hoạt động, còn hạn và còn lượt dùng từ dữ liệu thật. BẮT BUỘC dùng cho câu hỏi về ưu đãi, voucher hoặc mã giảm giá.",
                new { type = "object", properties = new { } }),
            Tool(
                AiAssistantToolNames.TableAvailability,
                "Kiểm tra các bàn/khu vực có thể phù hợp theo số khách và thời gian dự kiến. BẮT BUỘC dùng khi hỏi bàn trống/đặt bàn; không tự tạo đặt bàn.",
                new
                {
                    type = "object",
                    properties = new
                    {
                        guests = new { type = "integer", description = "Số lượng khách, tối thiểu 1." },
                        at = new { type = "string", description = "Thời gian dự kiến dạng ISO 8601 nếu khách có nêu ngày giờ." }
                    },
                    required = new[] { "guests" }
                }),
            Tool(
                AiAssistantToolNames.WebsiteCapabilities,
                "Lấy danh sách chức năng CustomerWeb và hướng dẫn khách tới đúng trang để đặt món, đặt bàn, thanh toán hoặc xem đơn.",
                new { type = "object", properties = new { } })
        };

        if (authenticated)
        {
            declarations.Add(Tool(
                AiAssistantToolNames.MyOrders,
                "Lấy các đơn hàng, trạng thái món/bếp, thanh toán và hóa đơn thuộc đúng tài khoản khách đang đăng nhập. BẮT BUỘC dùng khi khách hỏi đơn, hóa đơn hoặc trạng thái thanh toán của mình. Không được dùng cho khách khác.",
                new
                {
                    type = "object",
                    properties = new
                    {
                        orderCode = new { type = "string", description = "Mã đơn cụ thể nếu khách hỏi; để trống để lấy các đơn gần nhất." },
                        limit = new { type = "integer", description = "Số đơn tối đa, từ 1 đến 10." }
                    }
                }));

            declarations.Add(Tool(
                AiAssistantToolNames.MyNotifications,
                "Lấy các thông báo gần nhất thuộc đúng tài khoản khách đang đăng nhập.",
                new
                {
                    type = "object",
                    properties = new
                    {
                        limit = new { type = "integer", description = "Số thông báo tối đa, từ 1 đến 20." }
                    }
                }));
        }

        return declarations;
    }

    public static IReadOnlyList<JsonElement> GetAdminToolDeclarations()
    {
        return
        [
            Tool(
                AiAssistantToolNames.AdminOverview,
                "Lấy tổng quan vận hành hiện tại từ toàn bộ hệ thống: tài khoản, nhân viên, bàn, thực đơn, đơn hàng, bếp, thanh toán, đặt bàn, kho, thông báo và doanh thu hôm nay.",
                new { type = "object", properties = new { } }),
            Tool(
                AiAssistantToolNames.PaymentOptions,
                "Lấy danh mục phương thức thanh toán chuẩn của hệ thống, trạng thái cấu hình/sẵn sàng của QR SePay và thống kê các phương thức đã được dùng. BẮT BUỘC dùng khi Admin hỏi hệ thống hỗ trợ phương thức thanh toán nào; không dùng thay cho module payments khi hỏi danh sách giao dịch.",
                new { type = "object", properties = new { } }),
            Tool(
                AiAssistantToolNames.AdminModuleData,
                "Đọc dữ liệu mới nhất của đúng một module quản trị. Chỉ đọc, không thay đổi dữ liệu. Mapping bắt buộc: món/thực đơn -> menu; đơn/trạng thái đơn -> orders; bếp -> kitchen; giao dịch thanh toán -> payments; hóa đơn -> invoices; doanh thu -> revenue; đặt bàn -> reservations; khuyến mãi -> promotions; tồn kho/nguyên liệu -> inventory; giờ mở cửa/VAT/phí/cấu hình -> restaurant_settings.",
                new
                {
                    type = "object",
                    properties = new
                    {
                        module = new
                        {
                            type = "string",
                            description = "Module cần đọc.",
                            @enum = new[]
                            {
                                "dashboard", "users", "employees", "shifts", "areas", "tables",
                                "menu", "orders", "kitchen", "payments", "invoices", "revenue",
                                "reservations", "promotions", "inventory", "activity_logs",
                                "notifications", "table_qr", "table_operations", "permissions",
                                "restaurant_settings"
                            }
                        },
                        status = new { type = "string", description = "Bộ lọc trạng thái nếu module hỗ trợ." },
                        query = new { type = "string", description = "Từ khóa tìm kiếm nếu module hỗ trợ." },
                        fromDate = new { type = "string", description = "Ngày bắt đầu dạng yyyy-MM-dd nếu cần." },
                        toDate = new { type = "string", description = "Ngày kết thúc dạng yyyy-MM-dd nếu cần." },
                        limit = new { type = "integer", description = "Số dòng tối đa, từ 1 đến 50." }
                    },
                    required = new[] { "module" }
                })
        ];
    }

    private static JsonElement Tool(string name, string description, object parameters)
        => JsonSerializer.SerializeToElement(new { name, description, parameters });
}
