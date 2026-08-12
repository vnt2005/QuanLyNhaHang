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
            ?? throw new UnauthorizedAccessException(
                "Vui lòng đăng nhập tài khoản khách hàng.");

        var isActiveCustomer = await _context.Users
            .AsNoTracking()
            .AnyAsync(
                x =>
                    x.Id == customerUserId &&
                    x.Role == SystemRoles.Customer &&
                    x.IsActive &&
                    x.IsEmailVerified,
                cancellationToken);

        if (!isActiveCustomer)
        {
            throw new UnauthorizedAccessException(
                "Tài khoản khách hàng không còn hợp lệ.");
        }

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 50);

        var query =
            from order in _context.Orders.AsNoTracking()
            join table in _context.RestaurantTables.AsNoTracking()
                on order.RestaurantTableId equals table.Id
            where order.CustomerUserId == customerUserId && order.IsActive
            orderby order.CreatedAt descending
            select new QrOrderDto
            {
                Id = order.Id,
                RestaurantTableId = order.RestaurantTableId,
                RestaurantTableName = table.Name,
                OrderCode = order.OrderCode,
                Status = order.Status,
                TotalAmount = order.TotalAmount,
                Note = order.Note,
                CreatedAt = order.CreatedAt
            };

        var totalCount = await query.CountAsync(cancellationToken);

        var orders = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        if (orders.Count > 0)
        {
            var orderIds = orders.Select(x => x.Id).ToList();

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
                .ToDictionary(
                    x => x.Key,
                    x => x.Select(row => row.Item).ToList());

            foreach (var order in orders)
            {
                order.Items = itemsByOrder.GetValueOrDefault(order.Id)
                    ?? new List<QrOrderItemDto>();
            }
        }

        return new PaginatedList<QrOrderDto>(
            orders,
            totalCount,
            pageNumber,
            pageSize);
    }
}
