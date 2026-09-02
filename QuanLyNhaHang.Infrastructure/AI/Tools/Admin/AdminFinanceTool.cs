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
            note = "supportedMethods là catalog nghiệp vụ chuẩn; observedPaidMethods phản ánh toàn bộ dữ liệu giao dịch Paid đã phát sinh."
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

        var totalCount = await query.CountAsync(cancellationToken);
        var totalAmount = await query.SumAsync(item => (decimal?)item.FinalAmount, cancellationToken) ?? 0m;
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

        var attemptsQuery = _dbContext.PaymentAttempts.AsNoTracking();
        var paymentAttemptTotalCount = await attemptsQuery.CountAsync(cancellationToken);
        var attempts = await attemptsQuery
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

        return new
        {
            totalCount,
            totalAmount,
            returnedCount = payments.Count,
            hasMore = totalCount > payments.Count,
            payments,
            paymentAttempts = new
            {
                totalCount = paymentAttemptTotalCount,
                returnedCount = attempts.Count,
                hasMore = paymentAttemptTotalCount > attempts.Count,
                items = attempts
            }
        };
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

        var totalCount = await query.CountAsync(cancellationToken);
        var totalAmount = await query.SumAsync(item => (decimal?)item.FinalAmount, cancellationToken) ?? 0m;
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

        return new
        {
            totalCount,
            totalAmount,
            returnedCount = invoices.Count,
            hasMore = totalCount > invoices.Count,
            invoices
        };
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

        var reportsQuery = _dbContext.RevenueReports.AsNoTracking();
        var reportTotalCount = await reportsQuery.CountAsync(cancellationToken);
        var reports = await reportsQuery
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

        return new
        {
            live = new { from, to, paidCount, liveRevenue },
            reports = new
            {
                totalCount = reportTotalCount,
                returnedCount = reports.Count,
                hasMore = reportTotalCount > reports.Count,
                items = reports
            }
        };
    }
}
