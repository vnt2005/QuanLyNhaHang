using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Domain.Payments;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
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
}
