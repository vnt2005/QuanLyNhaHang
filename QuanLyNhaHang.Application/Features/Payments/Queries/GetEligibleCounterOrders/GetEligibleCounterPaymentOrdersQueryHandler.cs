using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Payments.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetEligibleCounterOrders;

public sealed class GetEligibleCounterPaymentOrdersQueryHandler
    : IRequestHandler<GetEligibleCounterPaymentOrdersQuery, IReadOnlyList<EligibleCounterPaymentOrderDto>>
{
    private readonly IApplicationDbContext _context;

    public GetEligibleCounterPaymentOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyList<EligibleCounterPaymentOrderDto>> Handle(
        GetEligibleCounterPaymentOrdersQuery request,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var query =
            from order in _context.Orders.AsNoTracking()
            join tableRow in _context.RestaurantTables.AsNoTracking()
                on order.RestaurantTableId equals (Guid?)tableRow.Id into tableRows
            from table in tableRows.DefaultIfEmpty()
            where order.IsActive
            where order.Status != "Cancelled" && order.Status != "Completed"
            where !_context.Payments.Any(payment =>
                payment.OrderId == order.Id && payment.Status == "Paid")
            where _context.OrderItems.Any(item =>
                item.OrderId == order.Id && item.Status != "Cancelled")
            where
                (order.OrderType == "Takeaway" &&
                 (order.Status == "Ready" || order.Status == "Served") &&
                 !_context.OrderItems.Any(item =>
                     item.OrderId == order.Id &&
                     item.Status != "Cancelled" &&
                     item.Status != "Ready" &&
                     item.Status != "Served")) ||
                (order.OrderType != "Takeaway" &&
                 order.Status == "Served" &&
                 !_context.OrderItems.Any(item =>
                     item.OrderId == order.Id &&
                     item.Status != "Cancelled" &&
                     item.Status != "Served"))
            where !_context.PaymentAttempts.Any(attempt =>
                attempt.OrderId == order.Id &&
                (attempt.Status == PaymentAttempt.PaidStatus ||
                 attempt.Status == PaymentAttempt.RequiresReviewStatus ||
                 ((attempt.Status == PaymentAttempt.CreatingStatus ||
                   attempt.Status == PaymentAttempt.PendingStatus) &&
                  attempt.ExpiresAt > now)))
            orderby order.CreatedAt descending
            select new EligibleCounterPaymentOrderDto
            {
                Id = order.Id,
                OrderCode = order.OrderCode,
                OrderType = order.OrderType,
                RestaurantTableName = table != null ? table.Name : "Mang về",
                CustomerName = order.CustomerName,
                Status = order.Status,
                TotalAmount = order.TotalAmount
            };

        return await query
            .Take(100)
            .ToListAsync(cancellationToken);
    }
}
