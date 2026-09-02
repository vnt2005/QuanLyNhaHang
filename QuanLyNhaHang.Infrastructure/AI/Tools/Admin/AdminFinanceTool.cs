using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Domain.Payments;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
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
        var paymentQuery = _dbContext.Payments
            .AsNoTracking()
            .Where(item => item.Status == "Paid");
        if (from.HasValue)
            paymentQuery = paymentQuery.Where(item => item.PaidAt >= from.Value);
        if (to.HasValue)
            paymentQuery = paymentQuery.Where(item => item.PaidAt < to.Value);

        var liveRevenue = await paymentQuery.SumAsync(
            item => (decimal?)item.FinalAmount,
            cancellationToken) ?? 0m;
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
}
