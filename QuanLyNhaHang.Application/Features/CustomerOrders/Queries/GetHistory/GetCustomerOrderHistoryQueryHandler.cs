using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Queries.GetHistory;

public class GetCustomerOrderHistoryQueryHandler
    : IRequestHandler<GetCustomerOrderHistoryQuery, PaginatedList<QrOrderDto>>
{
    private static readonly string[] ActiveStatuses =
    [
        "Pending",
        "Confirmed",
        "Preparing",
        "Cooking",
        "Ready"
    ];

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetCustomerOrderHistoryQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<PaginatedList<QrOrderDto>> Handle(
        GetCustomerOrderHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var customerUserId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException("Vui lòng đăng nhập tài khoản khách hàng.");

        var isActiveCustomer = await _context.Users
            .AsNoTracking()
            .AnyAsync(
                x => x.Id == customerUserId &&
                     x.Role == SystemRoles.Customer &&
                     x.IsActive &&
                     x.IsEmailVerified,
                cancellationToken);

        if (!isActiveCustomer)
            throw new UnauthorizedAccessException("Tài khoản khách hàng không còn hợp lệ.");

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 50);
        var filter = request.Filter?.Trim().ToLowerInvariant() ?? "all";
        var search = request.Search?.Trim() ?? string.Empty;

        var ordersQuery = _context.Orders
            .AsNoTracking()
            .Where(order =>
                order.CustomerUserId == customerUserId &&
                order.IsActive);

        ordersQuery = filter switch
        {
            "active" => ordersQuery.Where(order => ActiveStatuses.Contains(order.Status)),
            "completed" => ordersQuery.Where(order => order.Status == "Completed"),
            "cancelled" => ordersQuery.Where(order => order.Status == "Cancelled"),
            "paid" => ordersQuery.Where(order =>
                _context.Payments.Any(payment =>
                    payment.OrderId == order.Id &&
                    payment.Status == "Paid")),
            _ => ordersQuery
        };

        if (!string.IsNullOrWhiteSpace(search))
        {
            ordersQuery = ordersQuery.Where(order =>
                order.OrderCode.Contains(search) ||
                (order.CustomerName != null && order.CustomerName.Contains(search)) ||
                (order.CustomerPhoneNumber != null && order.CustomerPhoneNumber.Contains(search)) ||
                _context.RestaurantTables.Any(table =>
                    order.RestaurantTableId == table.Id &&
                    table.Name.Contains(search)) ||
                _context.OrderItems.Any(item =>
                    item.OrderId == order.Id &&
                    item.MenuItemName.Contains(search)));
        }

        var totalCount = await ordersQuery.CountAsync(cancellationToken);

        var query =
            from order in ordersQuery
            join tableRow in _context.RestaurantTables.AsNoTracking()
                on order.RestaurantTableId equals (Guid?)tableRow.Id into tableRows
            from table in tableRows.DefaultIfEmpty()
            orderby order.CreatedAt descending
            select new QrOrderDto
            {
                Id = order.Id,
                RestaurantTableId = order.RestaurantTableId,
                RestaurantTableName = table != null ? table.Name : "Mang về",
                OrderType = order.OrderType,
                CustomerName = order.CustomerName,
                CustomerPhoneNumber = order.CustomerPhoneNumber,
                PickupTime = order.PickupTime,
                OrderCode = order.OrderCode,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                Note = order.Note,
                CreatedAt = order.CreatedAt
            };

        var orders = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        if (orders.Count > 0)
        {
            var orderIds = orders.Select(x => x.Id).ToList();

            var paidPayments = await _context.Payments
                .AsNoTracking()
                .Where(payment =>
                    orderIds.Contains(payment.OrderId) &&
                    payment.Status == "Paid")
                .OrderByDescending(payment => payment.PaidAt)
                .ThenByDescending(payment => payment.CreatedAt)
                .Select(payment => new
                {
                    payment.OrderId,
                    payment.FinalAmount,
                    payment.PaymentMethod,
                    payment.PaidAt
                })
                .ToListAsync(cancellationToken);

            var paidByOrder = paidPayments
                .GroupBy(payment => payment.OrderId)
                .ToDictionary(group => group.Key, group => group.First());

            foreach (var order in orders)
            {
                if (!paidByOrder.TryGetValue(order.Id, out var payment))
                    continue;

                order.PaidAmount = payment.FinalAmount;
                order.PaymentMethod = payment.PaymentMethod;
                order.PaidAt = payment.PaidAt;
            }

            var items = await _context.OrderItems
                .AsNoTracking()
                .Where(x => orderIds.Contains(x.OrderId))
                .OrderBy(x => x.CreatedAt)
                .Select(x => new
                {
                    x.OrderId,
                    Item = new QrOrderItemDto
                    {
                        Id = x.Id,
                        MenuItemId = x.MenuItemId,
                        MenuItemName = x.MenuItemName,
                        Quantity = x.Quantity,
                        UnitPrice = x.UnitPrice,
                        TotalPrice = x.TotalPrice,
                        Status = x.Status,
                        Note = x.Note
                    }
                })
                .ToListAsync(cancellationToken);

            var itemsByOrder = items
                .GroupBy(x => x.OrderId)
                .ToDictionary(x => x.Key, x => x.Select(row => row.Item).ToList());

            foreach (var order in orders)
                order.Items = itemsByOrder.GetValueOrDefault(order.Id) ?? new List<QrOrderItemDto>();
        }

        return new PaginatedList<QrOrderDto>(orders, totalCount, pageNumber, pageSize);
    }
}
