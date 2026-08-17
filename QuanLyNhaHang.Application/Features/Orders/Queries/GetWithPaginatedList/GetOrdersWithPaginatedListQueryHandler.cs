using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Orders.DTOs;

namespace QuanLyNhaHang.Application.Features.Orders.Queries.GetWithPaginatedList;

public class GetOrdersWithPaginatedListQueryHandler
    : IRequestHandler<GetOrdersWithPaginatedListQuery, PaginatedList<OrderDto>>
{
    private readonly IApplicationDbContext _context;

    public GetOrdersWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<OrderDto>> Handle(
        GetOrdersWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from order in _context.Orders
            join tableRow in _context.RestaurantTables
                on order.RestaurantTableId equals (Guid?)tableRow.Id into tableRows
            from table in tableRows.DefaultIfEmpty()
            select new
            {
                Order = order,
                RestaurantTableName = table != null ? table.Name : "Mang về"
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim().ToLower();
            query = query.Where(x =>
                x.Order.OrderCode.ToLower().Contains(keyword) ||
                x.RestaurantTableName.ToLower().Contains(keyword) ||
                (x.Order.CustomerName != null && x.Order.CustomerName.ToLower().Contains(keyword)) ||
                (x.Order.CustomerPhoneNumber != null && x.Order.CustomerPhoneNumber.ToLower().Contains(keyword)) ||
                (x.Order.Note != null && x.Order.Note.ToLower().Contains(keyword)));
        }

        if (request.RestaurantTableId.HasValue)
            query = query.Where(x => x.Order.RestaurantTableId == request.RestaurantTableId.Value);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim();
            query = query.Where(x => x.Order.Status == status);
        }

        if (request.IsActive.HasValue)
            query = query.Where(x => x.Order.IsActive == request.IsActive.Value);

        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;
        var totalCount = await query.CountAsync(cancellationToken);

        var orders = await query
            .OrderByDescending(x => x.Order.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new OrderDto
            {
                Id = x.Order.Id,
                RestaurantTableId = x.Order.RestaurantTableId,
                RestaurantTableName = x.RestaurantTableName,
                OrderType = x.Order.OrderType,
                CustomerName = x.Order.CustomerName,
                CustomerPhoneNumber = x.Order.CustomerPhoneNumber,
                PickupTime = x.Order.PickupTime,
                OrderCode = x.Order.OrderCode,
                Status = x.Order.Status,
                TotalAmount = x.Order.TotalAmount,
                Note = x.Order.Note,
                IsActive = x.Order.IsActive,
                CreatedAt = x.Order.CreatedAt,
                UpdatedAt = x.Order.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        if (orders.Count > 0)
        {
            var orderIds = orders.Select(x => x.Id).ToList();
            var items = await _context.OrderItems
                .Where(x => orderIds.Contains(x.OrderId))
                .OrderBy(x => x.CreatedAt)
                .Select(x => new OrderItemDto
                {
                    Id = x.Id,
                    OrderId = x.OrderId,
                    MenuItemId = x.MenuItemId,
                    MenuItemName = x.MenuItemName,
                    Quantity = x.Quantity,
                    UnitPrice = x.UnitPrice,
                    TotalPrice = x.TotalPrice,
                    Status = x.Status,
                    Note = x.Note,
                    CreatedAt = x.CreatedAt,
                    UpdatedAt = x.UpdatedAt
                })
                .ToListAsync(cancellationToken);

            var itemsByOrder = items.GroupBy(x => x.OrderId).ToDictionary(x => x.Key, x => x.ToList());
            foreach (var order in orders)
                order.Items = itemsByOrder.GetValueOrDefault(order.Id) ?? new List<OrderItemDto>();
        }

        return new PaginatedList<OrderDto>(orders, totalCount, pageNumber, pageSize);
    }
}
