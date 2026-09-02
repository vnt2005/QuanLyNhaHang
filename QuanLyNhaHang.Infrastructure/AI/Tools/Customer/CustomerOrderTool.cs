using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
    private async Task<object> GetCustomerOrdersAsync(
        Guid customerUserId,
        JsonElement args,
        CancellationToken cancellationToken)
    {
        var orderCode = AiToolArguments.GetString(args, "orderCode");
        var status = AiToolArguments.GetString(args, "status").Trim().ToLowerInvariant();
        var paymentStatus = AiToolArguments.GetString(args, "paymentStatus").Trim().ToLowerInvariant();
        var limit = AiToolArguments.GetLimit(args, DefaultLimit, MaximumLimit);

        var allCustomerOrders = _dbContext.Orders
            .AsNoTracking()
            .Where(item => item.CustomerUserId == customerUserId);

        var paidOrderIds = _dbContext.Payments
            .AsNoTracking()
            .Where(item => item.Status == "Paid")
            .Select(item => item.OrderId)
            .Distinct();

        var totalOrders = await allCustomerOrders.CountAsync(cancellationToken);
        var paidOrders = await allCustomerOrders
            .CountAsync(item => paidOrderIds.Contains(item.Id), cancellationToken);
        var statusBreakdown = await allCustomerOrders
            .GroupBy(item => item.Status)
            .Select(group => new { status = group.Key, count = group.Count() })
            .OrderByDescending(item => item.count)
            .ToListAsync(cancellationToken);

        var query = allCustomerOrders;

        if (!string.IsNullOrWhiteSpace(orderCode))
            query = query.Where(item => item.OrderCode == orderCode);

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = status switch
            {
                "active" => query.Where(item =>
                    item.Status == "Pending"
                    || item.Status == "Confirmed"
                    || item.Status == "Preparing"
                    || item.Status == "Cooking"
                    || item.Status == "Ready"),
                "completed" => query.Where(item => item.Status == "Completed"),
                "cancelled" or "canceled" => query.Where(item => item.Status == "Cancelled"),
                "served" => query.Where(item => item.Status == "Served"),
                _ => query.Where(item => item.Status.ToLower() == status)
            };
        }

        if (paymentStatus == "paid")
            query = query.Where(item => paidOrderIds.Contains(item.Id));
        else if (paymentStatus == "unpaid")
            query = query.Where(item => !paidOrderIds.Contains(item.Id));

        var totalCount = await query.CountAsync(cancellationToken);
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
            summary = new
            {
                totalOrders,
                paidOrders,
                unpaidOrders = totalOrders - paidOrders,
                statusBreakdown
            },
            filter = new { orderCode, status, paymentStatus },
            totalCount,
            returnedCount = orders.Count,
            hasMore = totalCount > orders.Count,
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
        var limit = AiToolArguments.GetLimit(args, DefaultLimit, MaximumLimit);
        var query = _dbContext.Notifications
            .AsNoTracking()
            .Where(item => item.UserId == customerUserId);

        var totalCount = await query.CountAsync(cancellationToken);
        var unreadCount = await query.CountAsync(item => !item.IsRead, cancellationToken);
        var notifications = await query
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

        return new
        {
            totalCount,
            unreadCount,
            returnedCount = notifications.Count,
            hasMore = totalCount > notifications.Count,
            notifications
        };
    }
}
