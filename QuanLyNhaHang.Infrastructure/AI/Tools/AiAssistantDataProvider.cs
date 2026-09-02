using System.Text.Json;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
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
        => AiToolRegistry.GetCustomerToolDeclarations(authenticated);

    public IReadOnlyList<JsonElement> GetAdminToolDeclarations()
        => AiToolRegistry.GetAdminToolDeclarations();

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

    private async Task<object> GetAdminModuleDataAsync(
        JsonElement args,
        CancellationToken cancellationToken)
    {
        var module = AiToolArguments.GetString(args, "module").Trim().ToLowerInvariant();
        var status = AiToolArguments.GetString(args, "status");
        var query = AiToolArguments.GetString(args, "query");
        var limit = AiToolArguments.GetLimit(args, DefaultLimit, MaximumLimit);
        var fromDate = AiToolArguments.GetDate(args, "fromDate");
        var toDate = AiToolArguments.GetDate(args, "toDate")?.AddDays(1);

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
}
