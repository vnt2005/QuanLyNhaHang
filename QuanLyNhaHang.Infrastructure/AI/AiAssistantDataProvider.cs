using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;
using QuanLyNhaHang.Domain.Payments;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed class AiAssistantDataProvider
{
    private const int DefaultLimit = 20;
    private const int MaximumLimit = 50;

    private readonly IApplicationDbContext _dbContext;
    private readonly IPaymentGateway _paymentGateway;
    private readonly IPaymentChannelReadiness _paymentChannelReadiness;

    public AiAssistantDataProvider(
        IApplicationDbContext dbContext,
        IPaymentGateway paymentGateway,
        IPaymentChannelReadiness paymentChannelReadiness)
    {
        _dbContext = dbContext;
        _paymentGateway = paymentGateway;
        _paymentChannelReadiness = paymentChannelReadiness;
    }

    public IReadOnlyList<JsonElement> GetCustomerToolDeclarations(bool authenticated)
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

    public IReadOnlyList<JsonElement> GetAdminToolDeclarations()
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

    public async Task<object> ExecuteCustomerToolAsync(
        string name,
        JsonElement args,
        AiAssistantCallerContext caller,
        CancellationToken cancellationToken)
    {
        return name switch
        {
            AiAssistantToolNames.RestaurantInfo => await GetRestaurantInfoAsync(cancellationToken),
            AiAssistantToolNames.PaymentOptions => await GetCustomerPaymentOptionsAsync(cancellationToken),
            AiAssistantToolNames.SearchMenu => await SearchMenuAsync(args, cancellationToken),
            AiAssistantToolNames.ActivePromotions => await GetActivePromotionsAsync(cancellationToken),
            AiAssistantToolNames.TableAvailability => await GetTableAvailabilityAsync(args, cancellationToken),
            AiAssistantToolNames.WebsiteCapabilities => GetWebsiteCapabilities(),
            AiAssistantToolNames.MyOrders when caller.UserId.HasValue =>
                await GetCustomerOrdersAsync(caller.UserId.Value, args, cancellationToken),
            AiAssistantToolNames.MyNotifications when caller.UserId.HasValue =>
                await GetCustomerNotificationsAsync(caller.UserId.Value, args, cancellationToken),
            AiAssistantToolNames.MyOrders or AiAssistantToolNames.MyNotifications => new
            {
                available = false,
                reason = "Khách cần đăng nhập tài khoản Customer để AI đọc dữ liệu riêng của chính họ."
            },
            _ => new { error = "Công cụ dữ liệu khách hàng không hợp lệ." }
        };
    }

    public async Task<object> ExecuteAdminToolAsync(
        string name,
        JsonElement args,
        CancellationToken cancellationToken)
    {
        return name switch
        {
            AiAssistantToolNames.AdminOverview => await GetAdminOverviewAsync(cancellationToken),
            AiAssistantToolNames.PaymentOptions => await GetAdminPaymentOptionsAsync(cancellationToken),
            AiAssistantToolNames.AdminModuleData => await GetAdminModuleDataAsync(args, cancellationToken),
            _ => new { error = "Công cụ dữ liệu quản trị không hợp lệ." }
        };
    }

    private async Task<object> GetRestaurantInfoAsync(CancellationToken cancellationToken)
    {
        var setting = await _dbContext.RestaurantSettings
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .Select(item => new
            {
                item.RestaurantName,
                item.Address,
                item.PhoneNumber,
                item.Email,
                item.WebsiteUrl,
                item.OpeningTime,
                item.ClosingTime,
                item.DefaultVatPercent,
                item.ServiceChargePercent,
                item.Currency,
                item.QrOrderWelcomeMessage
            })
            .FirstOrDefaultAsync(cancellationToken);

        var areas = await _dbContext.Areas
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderBy(item => item.Name)
            .Select(item => new { item.Id, item.Name, item.Description })
            .ToListAsync(cancellationToken);

        var tables = await _dbContext.RestaurantTables
            .AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => new
            {
                item.AreaId,
                item.Name,
                item.Capacity,
                item.Status
            })
            .ToListAsync(cancellationToken);

        var areaNames = areas.ToDictionary(item => item.Id, item => item.Name);
        var tableSummary = tables
            .GroupBy(item => item.Status)
            .ToDictionary(group => group.Key, group => group.Count());

        return new
        {
            restaurant = setting,
            areas = areas.Select(item => new
            {
                item.Name,
                item.Description,
                tableCount = tables.Count(table => table.AreaId == item.Id),
                availableNow = tables.Count(table => table.AreaId == item.Id && table.Status == "Available")
            }),
            tableStatus = tableSummary,
            availableTables = tables
                .Where(item => item.Status == "Available")
                .OrderBy(item => item.Capacity)
                .Take(20)
                .Select(item => new
                {
                    area = areaNames.TryGetValue(item.AreaId, out var areaName) ? areaName : "Khác",
                    item.Name,
                    item.Capacity
                })
        };
    }

    private async Task<object> GetCustomerPaymentOptionsAsync(
        CancellationToken cancellationToken)
    {
        var currency = await _dbContext.RestaurantSettings
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .Select(item => item.Currency)
            .FirstOrDefaultAsync(cancellationToken) ?? "VND";
        var channel = _paymentChannelReadiness.GetSnapshot();
        var onlineAvailable = _paymentGateway.IsConfigured
                              && (!channel.Required || channel.Ready);
        var onlineAvailability = !_paymentGateway.IsConfigured
            ? "Kênh chuyển khoản QR chưa được cấu hình đầy đủ trên máy chủ."
            : channel.Required && !channel.Ready
                ? "Kênh chuyển khoản QR đang tạm khóa vì chưa xác nhận được kết nối webhook."
                : "Kênh chuyển khoản QR đang sẵn sàng; từng đơn vẫn phải đáp ứng trạng thái và quyền truy cập cho phép thanh toán.";

        return new
        {
            audience = "Customer",
            currency,
            customerWeb = PaymentMethodCatalog.All
                .Where(method => method.AvailableOnCustomerWeb)
                .Select(method => new
                {
                    code = method.Code,
                    name = method.DisplayName,
                    method.Description,
                    provider = _paymentGateway.Provider,
                    configured = _paymentGateway.IsConfigured,
                    availableNow = onlineAvailable,
                    availability = onlineAvailability
                }),
            atCounter = PaymentMethodCatalog.All
                .Where(method => method.AvailableAtCounter)
                .Select(method => new
                {
                    code = method.Code,
                    name = method.DisplayName,
                    method.Description
                }),
            rules = new[]
            {
                "CustomerWeb chỉ tự tạo thanh toán chuyển khoản QR/ngân hàng; các phương thức tại quầy do thu ngân ghi nhận.",
                "Không khẳng định một đơn có thể thanh toán nếu chưa kiểm tra trạng thái và quyền truy cập của chính đơn đó.",
                "Tool này chỉ đọc catalog và trạng thái kênh; không tạo giao dịch hoặc thay đổi đơn hàng."
            }
        };
    }

    private async Task<object> GetAdminPaymentOptionsAsync(
        CancellationToken cancellationToken)
    {
        var channel = _paymentChannelReadiness.GetSnapshot();
        var observedMethods = await _dbContext.Payments
            .AsNoTracking()
            .Where(payment => payment.Status == "Paid")
            .GroupBy(payment => payment.PaymentMethod)
            .Select(group => new
            {
                code = group.Key,
                paidCount = group.Count(),
                totalAmount = group.Sum(payment => payment.FinalAmount),
                lastPaidAt = group.Max(payment => payment.PaidAt)
            })
            .OrderByDescending(item => item.paidCount)
            .ToListAsync(cancellationToken);

        return new
        {
            audience = "Admin",
            supportedMethods = PaymentMethodCatalog.All.Select(method => new
            {
                code = method.Code,
                name = method.DisplayName,
                method.Description,
                method.AvailableAtCounter,
                method.AvailableOnCustomerWeb
            }),
            onlineChannel = new
            {
                provider = _paymentGateway.Provider,
                configured = _paymentGateway.IsConfigured,
                channel.Required,
                channel.Ready,
                availableNow = _paymentGateway.IsConfigured
                               && (!channel.Required || channel.Ready),
                channel.LastConfirmedAtUtc,
                channel.ValidUntilUtc
            },
            observedPaidMethods = observedMethods,
            readOnly = true,
            note = "supportedMethods là catalog nghiệp vụ chuẩn; observedPaidMethods chỉ phản ánh dữ liệu giao dịch Paid đã phát sinh."
        };
    }

    private async Task<object> SearchMenuAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var query = GetString(args, "query");
        var category = GetString(args, "category");
        var onlyAvailable = GetBoolean(args, "onlyAvailable", true);
        var limit = GetLimit(args, 30);

        var categories = await _dbContext.MenuCategories
            .AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => new { item.Id, item.Name })
            .ToListAsync(cancellationToken);
        var categoryNames = categories.ToDictionary(item => item.Id, item => item.Name);
        var categoryIds = string.IsNullOrWhiteSpace(category)
            ? null
            : categories
                .Where(item => item.Name.Contains(category, StringComparison.OrdinalIgnoreCase))
                .Select(item => item.Id)
                .ToHashSet();

        var items = await _dbContext.MenuItems
            .AsNoTracking()
            .Where(item => item.IsActive && (!onlyAvailable || item.IsAvailable))
            .OrderBy(item => item.Name)
            .Take(200)
            .ToListAsync(cancellationToken);

        var normalizedQuery = query.Trim();
        var filtered = items
            .Where(item => categoryIds is null || categoryIds.Contains(item.MenuCategoryId))
            .Where(item => normalizedQuery.Length == 0
                || item.Name.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)
                || (!string.IsNullOrWhiteSpace(item.Description)
                    && item.Description.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)))
            .Take(limit)
            .Select(item => new
            {
                item.Name,
                category = categoryNames.TryGetValue(item.MenuCategoryId, out var name) ? name : "Khác",
                item.Description,
                item.Price,
                item.IsAvailable
            })
            .ToList();

        return new
        {
            query,
            category,
            onlyAvailable,
            count = filtered.Count,
            items = filtered
        };
    }

    private async Task<object> GetActivePromotionsAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var promotions = await _dbContext.Promotions
            .AsNoTracking()
            .Where(item => item.IsActive
                && item.StartDate <= now
                && item.EndDate >= now
                && (!item.UsageLimit.HasValue || item.UsedCount < item.UsageLimit.Value))
            .OrderBy(item => item.EndDate)
            .Take(30)
            .Select(item => new
            {
                item.PromotionCode,
                item.Name,
                item.Description,
                item.DiscountType,
                item.DiscountValue,
                item.MinimumOrderAmount,
                item.MaximumDiscountAmount,
                item.StartDate,
                item.EndDate,
                item.UsageLimit,
                item.UsedCount
            })
            .ToListAsync(cancellationToken);

        return new { count = promotions.Count, promotions };
    }

    private async Task<object> GetTableAvailabilityAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var guests = Math.Clamp(GetInt(args, "guests", 1), 1, 100);
        var requestedAt = GetDateTime(args, "at");

        var areas = await _dbContext.Areas
            .AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => new { item.Id, item.Name })
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);

        var tables = await _dbContext.RestaurantTables
            .AsNoTracking()
            .Where(item => item.IsActive && item.Capacity >= guests)
            .OrderBy(item => item.Capacity)
            .ToListAsync(cancellationToken);

        HashSet<Guid> conflictingTableIds = [];
        if (requestedAt.HasValue)
        {
            var from = requestedAt.Value.AddMinutes(-90);
            var to = requestedAt.Value.AddMinutes(90);
            conflictingTableIds = await _dbContext.Reservations
                .AsNoTracking()
                .Where(item => (item.Status == "Pending" || item.Status == "Confirmed")
                    && item.ReservationTime >= from
                    && item.ReservationTime <= to)
                .Select(item => item.RestaurantTableId)
                .ToHashSetAsync(cancellationToken);
        }

        var candidates = tables
            .Where(item => requestedAt.HasValue
                ? !conflictingTableIds.Contains(item.Id)
                : item.Status == "Available")
            .Take(20)
            .Select(item => new
            {
                area = areas.TryGetValue(item.AreaId, out var areaName) ? areaName : "Khác",
                item.Name,
                item.Capacity,
                currentStatus = item.Status
            })
            .ToList();

        return new
        {
            guests,
            requestedAt,
            candidateCount = candidates.Count,
            candidates,
            note = "Đây là dữ liệu tham khảo tại thời điểm hỏi. Khách vẫn phải gửi yêu cầu ở trang Đặt bàn để hệ thống kiểm tra/xác nhận theo luồng nghiệp vụ."
        };
    }

    private static object GetWebsiteCapabilities()
    {
        return new
        {
            pages = new[]
            {
                new { name = "Trang chủ", purpose = "Xem thông tin nhà hàng và món nổi bật." },
                new { name = "Thực đơn", purpose = "Xem món, giá và tình trạng đang bán." },
                new { name = "Mang về", purpose = "Chọn món, tạo đơn mang về và theo dõi trạng thái." },
                new { name = "Đặt bàn", purpose = "Gửi yêu cầu đặt bàn theo thời gian và số khách." },
                new { name = "Đơn của tôi", purpose = "Khách đăng nhập xem đơn thuộc tài khoản, trạng thái bếp và thanh toán." },
                new { name = "Đăng nhập/Tài khoản", purpose = "Quản lý phiên khách hàng và thông tin tài khoản." }
            },
            rules = new[]
            {
                "AI chỉ tư vấn và đọc dữ liệu; AI không tự bấm đặt món, hủy đơn, thanh toán hay đặt bàn.",
                "Dữ liệu riêng như đơn hàng/thông báo chỉ được đọc khi đúng tài khoản Customer đang đăng nhập."
            }
        };
    }

    private async Task<object> GetCustomerOrdersAsync(
        Guid customerUserId,
        JsonElement args,
        CancellationToken cancellationToken)
    {
        var orderCode = GetString(args, "orderCode");
        var limit = Math.Clamp(GetInt(args, "limit", 8), 1, 10);

        var query = _dbContext.Orders
            .AsNoTracking()
            .Where(item => item.CustomerUserId == customerUserId);

        if (!string.IsNullOrWhiteSpace(orderCode))
        {
            query = query.Where(item => item.OrderCode == orderCode);
        }

        var orders = await query
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.Id,
                item.OrderCode,
                item.OrderType,
                item.Status,
                item.TotalAmount,
                item.PickupTime,
                item.CreatedAt,
                item.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var orderIds = orders.Select(item => item.Id).ToArray();
        var items = orderIds.Length == 0
            ? []
            : await _dbContext.OrderItems
                .AsNoTracking()
                .Where(item => orderIds.Contains(item.OrderId))
                .OrderBy(item => item.CreatedAt)
                .Select(item => new
                {
                    item.OrderId,
                    item.MenuItemName,
                    item.Quantity,
                    item.UnitPrice,
                    item.TotalPrice,
                    item.Status,
                    item.StartedAt,
                    item.CompletedAt
                })
                .ToListAsync(cancellationToken);

        var payments = orderIds.Length == 0
            ? []
            : await _dbContext.Payments
                .AsNoTracking()
                .Where(item => orderIds.Contains(item.OrderId))
                .OrderByDescending(item => item.PaidAt)
                .Select(item => new
                {
                    item.OrderId,
                    item.PaymentCode,
                    item.FinalAmount,
                    item.PaymentMethod,
                    item.Status,
                    item.PaidAt
                })
                .ToListAsync(cancellationToken);

        var attempts = orderIds.Length == 0
            ? []
            : await _dbContext.PaymentAttempts
                .AsNoTracking()
                .Where(item => orderIds.Contains(item.OrderId))
                .OrderByDescending(item => item.CreatedAt)
                .Select(item => new
                {
                    item.OrderId,
                    item.Provider,
                    item.Amount,
                    item.ReceivedAmount,
                    item.Status,
                    item.ExpiresAt,
                    item.PaidAt,
                    item.ReviewReason
                })
                .ToListAsync(cancellationToken);

        var invoices = orderIds.Length == 0
            ? []
            : await _dbContext.Invoices
                .AsNoTracking()
                .Where(item => orderIds.Contains(item.OrderId))
                .OrderByDescending(item => item.IssuedAt)
                .Select(item => new
                {
                    item.OrderId,
                    item.InvoiceCode,
                    item.FinalAmount,
                    item.PaymentMethod,
                    item.Status,
                    item.IssuedAt
                })
                .ToListAsync(cancellationToken);

        return new
        {
            count = orders.Count,
            orders = orders.Select(order => new
            {
                order.OrderCode,
                order.OrderType,
                order.Status,
                order.TotalAmount,
                order.PickupTime,
                order.CreatedAt,
                order.UpdatedAt,
                items = items.Where(item => item.OrderId == order.Id).Select(item => new
                {
                    item.MenuItemName,
                    item.Quantity,
                    item.UnitPrice,
                    item.TotalPrice,
                    item.Status,
                    item.StartedAt,
                    item.CompletedAt
                }),
                payments = payments.Where(item => item.OrderId == order.Id).Select(item => new
                {
                    item.PaymentCode,
                    item.FinalAmount,
                    item.PaymentMethod,
                    item.Status,
                    item.PaidAt
                }),
                paymentAttempts = attempts.Where(item => item.OrderId == order.Id).Select(item => new
                {
                    item.Provider,
                    item.Amount,
                    item.ReceivedAmount,
                    item.Status,
                    item.ExpiresAt,
                    item.PaidAt,
                    item.ReviewReason
                }),
                invoices = invoices.Where(item => item.OrderId == order.Id).Select(item => new
                {
                    item.InvoiceCode,
                    item.FinalAmount,
                    item.PaymentMethod,
                    item.Status,
                    item.IssuedAt
                })
            })
        };
    }

    private async Task<object> GetCustomerNotificationsAsync(
        Guid customerUserId,
        JsonElement args,
        CancellationToken cancellationToken)
    {
        var limit = Math.Clamp(GetInt(args, "limit", 10), 1, 20);
        var notifications = await _dbContext.Notifications
            .AsNoTracking()
            .Where(item => item.UserId == customerUserId)
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.Type,
                item.Title,
                item.Message,
                item.Severity,
                item.Target,
                item.EntityId,
                item.IsRead,
                item.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new { count = notifications.Count, notifications };
    }

    private async Task<object> GetAdminOverviewAsync(CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var revenueToday = await _dbContext.Payments
            .AsNoTracking()
            .Where(item => item.Status == "Paid" && item.PaidAt >= today && item.PaidAt < tomorrow)
            .SumAsync(item => (decimal?)item.FinalAmount, cancellationToken) ?? 0m;

        return new
        {
            generatedAtUtc = DateTime.UtcNow,
            accounts = new
            {
                total = await _dbContext.Users.CountAsync(cancellationToken),
                active = await _dbContext.Users.CountAsync(item => item.IsActive, cancellationToken)
            },
            employees = new
            {
                total = await _dbContext.Employees.CountAsync(cancellationToken),
                active = await _dbContext.Employees.CountAsync(item => item.IsActive, cancellationToken),
                shifts = await _dbContext.Shifts.CountAsync(item => item.IsActive, cancellationToken)
            },
            restaurant = new
            {
                areas = await _dbContext.Areas.CountAsync(item => item.IsActive, cancellationToken),
                tables = await _dbContext.RestaurantTables.CountAsync(item => item.IsActive, cancellationToken),
                availableTables = await _dbContext.RestaurantTables.CountAsync(item => item.IsActive && item.Status == "Available", cancellationToken)
            },
            menu = new
            {
                categories = await _dbContext.MenuCategories.CountAsync(item => item.IsActive, cancellationToken),
                items = await _dbContext.MenuItems.CountAsync(item => item.IsActive, cancellationToken),
                availableItems = await _dbContext.MenuItems.CountAsync(item => item.IsActive && item.IsAvailable, cancellationToken)
            },
            orders = new
            {
                today = await _dbContext.Orders.CountAsync(item => item.CreatedAt >= today && item.CreatedAt < tomorrow, cancellationToken),
                pending = await _dbContext.Orders.CountAsync(item => item.IsActive && item.Status == "Pending", cancellationToken),
                cooking = await _dbContext.Orders.CountAsync(item => item.IsActive && item.Status == "Cooking", cancellationToken),
                ready = await _dbContext.Orders.CountAsync(item => item.IsActive && item.Status == "Ready", cancellationToken)
            },
            kitchen = new
            {
                pendingItems = await _dbContext.OrderItems.CountAsync(item => item.Status == "Pending", cancellationToken),
                cookingItems = await _dbContext.OrderItems.CountAsync(item => item.Status == "Cooking", cancellationToken),
                readyItems = await _dbContext.OrderItems.CountAsync(item => item.Status == "Ready", cancellationToken)
            },
            payments = new
            {
                revenueToday,
                paidToday = await _dbContext.Payments.CountAsync(item => item.Status == "Paid" && item.PaidAt >= today && item.PaidAt < tomorrow, cancellationToken),
                attemptsPending = await _dbContext.PaymentAttempts.CountAsync(item => item.Status == "Pending", cancellationToken),
                attemptsReview = await _dbContext.PaymentAttempts.CountAsync(item => item.Status == "RequiresReview", cancellationToken)
            },
            reservations = new
            {
                today = await _dbContext.Reservations.CountAsync(item => item.ReservationTime >= today && item.ReservationTime < tomorrow, cancellationToken),
                pending = await _dbContext.Reservations.CountAsync(item => item.Status == "Pending", cancellationToken),
                confirmed = await _dbContext.Reservations.CountAsync(item => item.Status == "Confirmed", cancellationToken)
            },
            inventory = new
            {
                ingredients = await _dbContext.Ingredients.CountAsync(item => item.IsActive, cancellationToken),
                lowStock = await _dbContext.Ingredients.CountAsync(item => item.IsActive && item.CurrentStock <= item.MinimumStock, cancellationToken),
                transactionsToday = await _dbContext.InventoryTransactions.CountAsync(item => item.TransactionDate >= today && item.TransactionDate < tomorrow, cancellationToken)
            },
            promotions = new
            {
                active = await _dbContext.Promotions.CountAsync(item => item.IsActive && item.StartDate <= DateTime.UtcNow && item.EndDate >= DateTime.UtcNow, cancellationToken)
            },
            system = new
            {
                unreadNotifications = await _dbContext.Notifications.CountAsync(item => !item.IsRead, cancellationToken),
                activityLogsToday = await _dbContext.ActivityLogs.CountAsync(item => item.CreatedAt >= today && item.CreatedAt < tomorrow, cancellationToken),
                activeTableQr = await _dbContext.TableQrCodes.CountAsync(item => item.IsActive, cancellationToken)
            }
        };
    }

    private async Task<object> GetAdminModuleDataAsync(JsonElement args, CancellationToken cancellationToken)
    {
        var module = GetString(args, "module").Trim().ToLowerInvariant();
        var status = GetString(args, "status");
        var query = GetString(args, "query");
        var limit = GetLimit(args, DefaultLimit);
        var fromDate = GetDate(args, "fromDate");
        var toDate = GetDate(args, "toDate")?.AddDays(1);

        return module switch
        {
            "dashboard" => await GetAdminOverviewAsync(cancellationToken),
            "users" => await GetUsersModuleAsync(limit, cancellationToken),
            "employees" => await GetEmployeesModuleAsync(query, limit, cancellationToken),
            "shifts" => await GetShiftsModuleAsync(limit, cancellationToken),
            "areas" or "tables" => await GetTablesModuleAsync(cancellationToken),
            "menu" => await GetMenuModuleAsync(query, limit, cancellationToken),
            "orders" => await GetOrdersModuleAsync(status, query, fromDate, toDate, limit, cancellationToken),
            "kitchen" => await GetKitchenModuleAsync(status, limit, cancellationToken),
            "payments" => await GetPaymentsModuleAsync(status, fromDate, toDate, limit, cancellationToken),
            "invoices" => await GetInvoicesModuleAsync(status, fromDate, toDate, limit, cancellationToken),
            "revenue" => await GetRevenueModuleAsync(fromDate, toDate, limit, cancellationToken),
            "reservations" => await GetReservationsModuleAsync(status, fromDate, toDate, limit, cancellationToken),
            "promotions" => await GetPromotionsModuleAsync(limit, cancellationToken),
            "inventory" => await GetInventoryModuleAsync(query, limit, cancellationToken),
            "activity_logs" => await GetActivityLogsModuleAsync(query, fromDate, toDate, limit, cancellationToken),
            "notifications" => await GetNotificationsModuleAsync(status, limit, cancellationToken),
            "table_qr" => await GetTableQrModuleAsync(limit, cancellationToken),
            "table_operations" => await GetTableOperationsModuleAsync(limit, cancellationToken),
            "permissions" => await GetPermissionsModuleAsync(cancellationToken),
            "restaurant_settings" => await GetRestaurantSettingsModuleAsync(cancellationToken),
            _ => new { error = $"Module '{module}' không nằm trong danh mục AI quản trị cho phép." }
        };
    }

    private async Task<object> GetUsersModuleAsync(int limit, CancellationToken cancellationToken)
    {
        var roleBreakdown = await _dbContext.Users
            .AsNoTracking()
            .GroupBy(item => item.Role)
            .Select(group => new { role = group.Key, count = group.Count(), active = group.Count(item => item.IsActive) })
            .OrderByDescending(item => item.count)
            .ToListAsync(cancellationToken);

        var recent = await _dbContext.Users
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.Id,
                item.Ho,
                item.Ten,
                item.Email,
                item.PhoneNumber,
                item.Role,
                item.IsActive,
                item.IsEmailVerified,
                item.TwoFactorEnabled,
                item.CreatedAt,
                item.LoginLockedUntil
            })
            .ToListAsync(cancellationToken);

        return new
        {
            total = await _dbContext.Users.CountAsync(cancellationToken),
            roleBreakdown,
            recent,
            excludedFields = new[] { "PasswordHash", "verification/reset/2FA codes" }
        };
    }

    private async Task<object> GetEmployeesModuleAsync(string query, int limit, CancellationToken cancellationToken)
    {
        var employees = await _dbContext.Employees
            .AsNoTracking()
            .OrderBy(item => item.EmployeeCode)
            .Take(200)
            .ToListAsync(cancellationToken);

        var filtered = employees
            .Where(item => string.IsNullOrWhiteSpace(query)
                || item.EmployeeCode.Contains(query, StringComparison.OrdinalIgnoreCase)
                || item.Ten.Contains(query, StringComparison.OrdinalIgnoreCase)
                || (!string.IsNullOrWhiteSpace(item.Ho) && item.Ho.Contains(query, StringComparison.OrdinalIgnoreCase))
                || item.Position.Contains(query, StringComparison.OrdinalIgnoreCase))
            .Take(limit)
            .Select(item => new
            {
                item.EmployeeCode,
                fullName = string.Join(' ', new[] { item.Ho, item.Ten }.Where(part => !string.IsNullOrWhiteSpace(part))),
                item.Email,
                item.PhoneNumber,
                item.Position,
                item.BaseSalary,
                item.HireDate,
                item.IsActive
            })
            .ToList();

        return new { count = filtered.Count, employees = filtered };
    }

    private async Task<object> GetShiftsModuleAsync(int limit, CancellationToken cancellationToken)
    {
        var shifts = await _dbContext.Shifts
            .AsNoTracking()
            .OrderBy(item => item.StartTime)
            .Select(item => new
            {
                item.Id,
                item.ShiftCode,
                item.ShiftName,
                item.StartTime,
                item.EndTime,
                item.IsActive
            })
            .ToListAsync(cancellationToken);

        var from = DateTime.UtcNow.Date.AddDays(-1);
        var to = from.AddDays(9);
        var assignments = await _dbContext.EmployeeShifts
            .AsNoTracking()
            .Where(item => item.IsActive && item.WorkDate >= from && item.WorkDate < to)
            .OrderBy(item => item.WorkDate)
            .Take(limit)
            .Select(item => new { item.EmployeeId, item.ShiftId, item.WorkDate, item.Note })
            .ToListAsync(cancellationToken);

        var employeeIds = assignments.Select(item => item.EmployeeId).Distinct().ToArray();
        var employees = employeeIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await _dbContext.Employees
                .AsNoTracking()
                .Where(item => employeeIds.Contains(item.Id))
                .ToDictionaryAsync(
                    item => item.Id,
                    item => (item.Ho == null ? string.Empty : item.Ho + " ") + item.Ten,
                    cancellationToken);
        var shiftNames = shifts.ToDictionary(item => item.Id, item => item.ShiftName);

        return new
        {
            shifts = shifts.Select(item => new { item.ShiftCode, item.ShiftName, item.StartTime, item.EndTime, item.IsActive }),
            assignments = assignments.Select(item => new
            {
                employee = employees.TryGetValue(item.EmployeeId, out var employee) ? employee : item.EmployeeId.ToString(),
                shift = shiftNames.TryGetValue(item.ShiftId, out var shift) ? shift : item.ShiftId.ToString(),
                item.WorkDate,
                item.Note
            })
        };
    }

    private async Task<object> GetTablesModuleAsync(CancellationToken cancellationToken)
    {
        var areas = await _dbContext.Areas
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new { item.Id, item.Name, item.Description, item.IsActive })
            .ToListAsync(cancellationToken);
        var areaNames = areas.ToDictionary(item => item.Id, item => item.Name);
        var tables = await _dbContext.RestaurantTables
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new { item.AreaId, item.Name, item.Capacity, item.Status, item.Note, item.IsActive })
            .ToListAsync(cancellationToken);

        return new
        {
            areas = areas.Select(item => new { item.Name, item.Description, item.IsActive }),
            tables = tables.Select(item => new
            {
                area = areaNames.TryGetValue(item.AreaId, out var areaName) ? areaName : "Khác",
                item.Name,
                item.Capacity,
                item.Status,
                item.Note,
                item.IsActive
            })
        };
    }

    private async Task<object> GetMenuModuleAsync(string query, int limit, CancellationToken cancellationToken)
    {
        var categories = await _dbContext.MenuCategories
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new { item.Id, item.Name, item.IsActive })
            .ToListAsync(cancellationToken);
        var categoryNames = categories.ToDictionary(item => item.Id, item => item.Name);
        var items = await _dbContext.MenuItems
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Take(250)
            .ToListAsync(cancellationToken);

        var filtered = items
            .Where(item => string.IsNullOrWhiteSpace(query)
                || item.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
                || (!string.IsNullOrWhiteSpace(item.Description) && item.Description.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .Take(limit)
            .Select(item => new
            {
                item.Name,
                category = categoryNames.TryGetValue(item.MenuCategoryId, out var category) ? category : "Khác",
                item.Description,
                item.Price,
                item.IsAvailable,
                item.IsActive
            })
            .ToList();

        return new { categories = categories.Select(item => new { item.Name, item.IsActive }), items = filtered };
    }

    private async Task<object> GetOrdersModuleAsync(
        string status,
        string query,
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var ordersQuery = _dbContext.Orders.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            ordersQuery = ordersQuery.Where(item => item.Status == status);
        if (from.HasValue)
            ordersQuery = ordersQuery.Where(item => item.CreatedAt >= from.Value);
        if (to.HasValue)
            ordersQuery = ordersQuery.Where(item => item.CreatedAt < to.Value);
        if (!string.IsNullOrWhiteSpace(query))
            ordersQuery = ordersQuery.Where(item => item.OrderCode.Contains(query));

        var orders = await ordersQuery
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.Id,
                item.OrderCode,
                item.OrderType,
                item.Status,
                item.TotalAmount,
                item.RestaurantTableId,
                item.PickupTime,
                item.IsActive,
                item.CreatedAt,
                item.UpdatedAt
            })
            .ToListAsync(cancellationToken);
        var ids = orders.Select(item => item.Id).ToArray();
        var items = ids.Length == 0
            ? []
            : await _dbContext.OrderItems
                .AsNoTracking()
                .Where(item => ids.Contains(item.OrderId))
                .Select(item => new { item.OrderId, item.MenuItemName, item.Quantity, item.TotalPrice, item.Status })
                .ToListAsync(cancellationToken);

        return new
        {
            count = orders.Count,
            orders = orders.Select(order => new
            {
                order.OrderCode,
                order.OrderType,
                order.Status,
                order.TotalAmount,
                order.RestaurantTableId,
                order.PickupTime,
                order.IsActive,
                order.CreatedAt,
                order.UpdatedAt,
                items = items.Where(item => item.OrderId == order.Id).Select(item => new
                {
                    item.MenuItemName,
                    item.Quantity,
                    item.TotalPrice,
                    item.Status
                })
            }),
            privacy = "Tên/số điện thoại khách không được chuyển sang Gemini trong công cụ quản trị này."
        };
    }

    private async Task<object> GetKitchenModuleAsync(string status, int limit, CancellationToken cancellationToken)
    {
        var query = _dbContext.OrderItems.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(item => item.Status == status);
        else
            query = query.Where(item => item.Status == "Pending" || item.Status == "Cooking" || item.Status == "Ready");

        var items = await query
            .OrderBy(item => item.Status)
            .ThenBy(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.OrderId,
                item.MenuItemName,
                item.Quantity,
                item.Status,
                item.Note,
                item.CreatedAt,
                item.StartedAt,
                item.CompletedAt
            })
            .ToListAsync(cancellationToken);
        return new { count = items.Count, items };
    }

    private async Task<object> GetPaymentsModuleAsync(
        string status,
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Payments.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(item => item.Status == status);
        if (from.HasValue)
            query = query.Where(item => item.PaidAt >= from.Value);
        if (to.HasValue)
            query = query.Where(item => item.PaidAt < to.Value);

        var payments = await query
            .OrderByDescending(item => item.PaidAt)
            .Take(limit)
            .Select(item => new
            {
                item.OrderId,
                item.PaymentCode,
                item.TotalAmount,
                item.DiscountAmount,
                item.VatAmount,
                item.FinalAmount,
                item.PaymentMethod,
                item.Status,
                item.PaidAt
            })
            .ToListAsync(cancellationToken);

        var attempts = await _dbContext.PaymentAttempts
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.OrderId,
                item.Provider,
                item.Amount,
                item.ReceivedAmount,
                item.Status,
                item.ProviderStatus,
                item.ReviewReason,
                item.ExpiresAt,
                item.PaidAt
            })
            .ToListAsync(cancellationToken);

        return new { payments, paymentAttempts = attempts };
    }

    private async Task<object> GetInvoicesModuleAsync(
        string status,
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Invoices.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(item => item.Status == status);
        if (from.HasValue)
            query = query.Where(item => item.IssuedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(item => item.IssuedAt < to.Value);

        var invoices = await query
            .OrderByDescending(item => item.IssuedAt)
            .Take(limit)
            .Select(item => new
            {
                item.InvoiceCode,
                item.OrderCode,
                item.PaymentCode,
                item.RestaurantTableName,
                item.TotalAmount,
                item.DiscountAmount,
                item.VatAmount,
                item.FinalAmount,
                item.PaymentMethod,
                item.Status,
                item.IssuedAt
            })
            .ToListAsync(cancellationToken);
        return new { count = invoices.Count, invoices };
    }

    private async Task<object> GetRevenueModuleAsync(
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var paymentQuery = _dbContext.Payments.AsNoTracking().Where(item => item.Status == "Paid");
        if (from.HasValue) paymentQuery = paymentQuery.Where(item => item.PaidAt >= from.Value);
        if (to.HasValue) paymentQuery = paymentQuery.Where(item => item.PaidAt < to.Value);

        var liveRevenue = await paymentQuery.SumAsync(item => (decimal?)item.FinalAmount, cancellationToken) ?? 0m;
        var paidCount = await paymentQuery.CountAsync(cancellationToken);
        var reports = await _dbContext.RevenueReports
            .AsNoTracking()
            .OrderByDescending(item => item.GeneratedAt)
            .Take(limit)
            .Select(item => new
            {
                item.ReportCode,
                item.FromDate,
                item.ToDate,
                item.TotalInvoices,
                item.TotalOrders,
                item.TotalRevenue,
                item.AverageRevenuePerInvoice,
                item.Status,
                item.GeneratedAt
            })
            .ToListAsync(cancellationToken);

        return new { live = new { from, to, paidCount, liveRevenue }, reports };
    }

    private async Task<object> GetReservationsModuleAsync(
        string status,
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Reservations.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(item => item.Status == status);
        if (from.HasValue) query = query.Where(item => item.ReservationTime >= from.Value);
        if (to.HasValue) query = query.Where(item => item.ReservationTime < to.Value);

        var reservations = await query
            .OrderByDescending(item => item.ReservationTime)
            .Take(limit)
            .Select(item => new
            {
                item.ReservationCode,
                item.RestaurantTableId,
                item.NumberOfGuests,
                item.ReservationTime,
                item.DepositAmount,
                item.Status,
                item.CreatedAt,
                item.ConfirmedAt,
                item.CheckedInAt,
                item.CompletedAt,
                item.CancelledAt
            })
            .ToListAsync(cancellationToken);
        return new
        {
            count = reservations.Count,
            reservations,
            privacy = "Tên, email và số điện thoại khách đặt bàn không được chuyển sang Gemini."
        };
    }

    private async Task<object> GetPromotionsModuleAsync(int limit, CancellationToken cancellationToken)
    {
        var promotions = await _dbContext.Promotions
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.PromotionCode,
                item.Name,
                item.Description,
                item.DiscountType,
                item.DiscountValue,
                item.MinimumOrderAmount,
                item.MaximumDiscountAmount,
                item.StartDate,
                item.EndDate,
                item.UsageLimit,
                item.UsedCount,
                item.IsActive
            })
            .ToListAsync(cancellationToken);
        return new { count = promotions.Count, promotions };
    }

    private async Task<object> GetInventoryModuleAsync(string query, int limit, CancellationToken cancellationToken)
    {
        var ingredients = await _dbContext.Ingredients
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Take(250)
            .ToListAsync(cancellationToken);
        var filtered = ingredients
            .Where(item => string.IsNullOrWhiteSpace(query)
                || item.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
                || item.IngredientCode.Contains(query, StringComparison.OrdinalIgnoreCase))
            .Take(limit)
            .Select(item => new
            {
                item.IngredientCode,
                item.Name,
                item.Unit,
                item.CurrentStock,
                item.MinimumStock,
                item.CostPrice,
                lowStock = item.CurrentStock <= item.MinimumStock,
                item.IsActive
            })
            .ToList();

        var transactions = await _dbContext.InventoryTransactions
            .AsNoTracking()
            .OrderByDescending(item => item.TransactionDate)
            .Take(limit)
            .Select(item => new
            {
                item.TransactionCode,
                item.IngredientId,
                item.TransactionType,
                item.Quantity,
                item.UnitPrice,
                item.TotalAmount,
                item.StockBefore,
                item.StockAfter,
                item.Status,
                item.TransactionDate
            })
            .ToListAsync(cancellationToken);
        return new { ingredients = filtered, recentTransactions = transactions };
    }

    private async Task<object> GetActivityLogsModuleAsync(
        string query,
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var logsQuery = _dbContext.ActivityLogs.AsNoTracking().AsQueryable();
        if (from.HasValue) logsQuery = logsQuery.Where(item => item.CreatedAt >= from.Value);
        if (to.HasValue) logsQuery = logsQuery.Where(item => item.CreatedAt < to.Value);
        if (!string.IsNullOrWhiteSpace(query))
        {
            logsQuery = logsQuery.Where(item =>
                item.Action.Contains(query)
                || item.ModuleName.Contains(query)
                || item.Description.Contains(query));
        }

        var logs = await logsQuery
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.UserName,
                item.Action,
                item.ModuleName,
                item.EntityName,
                item.EntityId,
                item.Description,
                item.Status,
                item.CreatedAt
            })
            .ToListAsync(cancellationToken);
        return new
        {
            count = logs.Count,
            logs,
            excludedFields = new[] { "OldValues", "NewValues", "IpAddress", "UserAgent" }
        };
    }

    private async Task<object> GetNotificationsModuleAsync(string status, int limit, CancellationToken cancellationToken)
    {
        var query = _dbContext.Notifications.AsNoTracking().AsQueryable();
        if (string.Equals(status, "unread", StringComparison.OrdinalIgnoreCase))
            query = query.Where(item => !item.IsRead);
        if (string.Equals(status, "read", StringComparison.OrdinalIgnoreCase))
            query = query.Where(item => item.IsRead);

        var notifications = await query
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.UserId,
                item.Type,
                item.Title,
                item.Message,
                item.Severity,
                item.Target,
                item.EntityId,
                item.IsRead,
                item.CreatedAt
            })
            .ToListAsync(cancellationToken);
        return new { count = notifications.Count, notifications };
    }

    private async Task<object> GetTableQrModuleAsync(int limit, CancellationToken cancellationToken)
    {
        var tables = await _dbContext.RestaurantTables
            .AsNoTracking()
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
        var qrs = await _dbContext.TableQrCodes
            .AsNoTracking()
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.RestaurantTableId,
                item.Status,
                item.Note,
                item.IsActive,
                item.CreatedAt,
                item.UpdatedAt
            })
            .ToListAsync(cancellationToken);
        return new
        {
            count = qrs.Count,
            qrCodes = qrs.Select(item => new
            {
                table = tables.TryGetValue(item.RestaurantTableId, out var table) ? table : item.RestaurantTableId.ToString(),
                item.Status,
                item.Note,
                item.IsActive,
                item.CreatedAt,
                item.UpdatedAt
            }),
            excludedFields = new[] { "Token", "QrCodeUrl" }
        };
    }

    private async Task<object> GetTableOperationsModuleAsync(int limit, CancellationToken cancellationToken)
    {
        var operations = await _dbContext.TableOperations
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.OperationCode,
                item.OperationType,
                item.SourceTableId,
                item.TargetTableId,
                item.SourceOrderId,
                item.TargetOrderId,
                item.Status,
                item.Note,
                item.CreatedAt,
                item.CompletedAt
            })
            .ToListAsync(cancellationToken);
        return new { count = operations.Count, operations };
    }

    private async Task<object> GetPermissionsModuleAsync(CancellationToken cancellationToken)
    {
        return new
        {
            roles = await _dbContext.Roles.CountAsync(cancellationToken),
            permissions = await _dbContext.Permissions.CountAsync(cancellationToken),
            rolePermissionLinks = await _dbContext.RolePermissions.CountAsync(cancellationToken),
            note = "AI quản trị chỉ đọc thống kê phân quyền; không nhận password hash, mã xác minh hoặc secret."
        };
    }

    private async Task<object> GetRestaurantSettingsModuleAsync(CancellationToken cancellationToken)
    {
        var setting = await _dbContext.RestaurantSettings
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .Select(item => new
            {
                item.RestaurantName,
                item.Address,
                item.PhoneNumber,
                item.Email,
                item.TaxCode,
                item.WebsiteUrl,
                item.DefaultVatPercent,
                item.ServiceChargePercent,
                item.Currency,
                item.OpeningTime,
                item.ClosingTime,
                item.InvoiceFooter,
                item.QrOrderWelcomeMessage,
                item.AiAssistantEnabled,
                item.AiAssistantModel,
                item.AiAssistantMaxOutputTokens,
                item.IsActive,
                item.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
        return new { setting, excludedFields = new[] { "Gemini API key", "AI system prompt internals" } };
    }

    private static JsonElement Tool(string name, string description, object parameters)
    {
        return JsonSerializer.SerializeToElement(new { name, description, parameters });
    }

    private static string GetString(JsonElement args, string property)
    {
        return args.ValueKind == JsonValueKind.Object
            && args.TryGetProperty(property, out var value)
            && value.ValueKind == JsonValueKind.String
                ? value.GetString()?.Trim() ?? string.Empty
                : string.Empty;
    }

    private static int GetInt(JsonElement args, string property, int fallback)
    {
        if (args.ValueKind == JsonValueKind.Object
            && args.TryGetProperty(property, out var value))
        {
            if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
                return number;
            if (value.ValueKind == JsonValueKind.String
                && int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out number))
                return number;
        }
        return fallback;
    }

    private static bool GetBoolean(JsonElement args, string property, bool fallback)
    {
        if (args.ValueKind == JsonValueKind.Object
            && args.TryGetProperty(property, out var value))
        {
            if (value.ValueKind is JsonValueKind.True or JsonValueKind.False)
                return value.GetBoolean();
            if (value.ValueKind == JsonValueKind.String && bool.TryParse(value.GetString(), out var result))
                return result;
        }
        return fallback;
    }

    private static int GetLimit(JsonElement args, int fallback)
    {
        return Math.Clamp(GetInt(args, "limit", fallback), 1, MaximumLimit);
    }

    private static DateTime? GetDate(JsonElement args, string property)
    {
        var value = GetString(args, property);
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
            return parsed.ToUniversalTime().Date;
        return null;
    }

    private static DateTime? GetDateTime(JsonElement args, string property)
    {
        var value = GetString(args, property);
        if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
            return parsed.ToUniversalTime();
        return null;
    }
}
