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
        var limit = Math.Clamp(AiToolArguments.GetInt(args, "limit", 8), 1, 10);

        var query = _dbContext.Orders
            .AsNoTracking()
            .Where(item => item.CustomerUserId == customerUserId);

        if (!string.IsNullOrWhiteSpace(orderCode))
            query = query.Where(item => item.OrderCode == orderCode);

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
        var limit = Math.Clamp(AiToolArguments.GetInt(args, "limit", 10), 1, 20);
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
}
