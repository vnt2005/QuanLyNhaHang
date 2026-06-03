using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Orders.DTOs;

namespace QuanLyNhaHang.Application.Features.Orders.Queries.GetWithPaginatedList;

public class GetOrdersWithPaginatedListQueryHandler
    : IRequestHandler<GetOrdersWithPaginatedListQuery, List<OrderDto>>
{
    private readonly IApplicationDbContext _context;

    public GetOrdersWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<OrderDto>> Handle(
        GetOrdersWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from order in _context.Orders
            join table in _context.RestaurantTables
                on order.RestaurantTableId equals table.Id
            select new
            {
                Order = order,
                RestaurantTableName = table.Name
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim().ToLower();

            query = query.Where(x =>
                x.Order.OrderCode.ToLower().Contains(keyword) ||
                x.RestaurantTableName.ToLower().Contains(keyword) ||
                (x.Order.Note != null &&
                 x.Order.Note.ToLower().Contains(keyword)));
        }

        if (request.RestaurantTableId.HasValue)
        {
            query = query.Where(x =>
                x.Order.RestaurantTableId == request.RestaurantTableId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim();

            query = query.Where(x => x.Order.Status == status);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.Order.IsActive == request.IsActive.Value);
        }

        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

        var orders = await query
            .OrderByDescending(x => x.Order.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new OrderDto
            {
                Id = x.Order.Id,
                RestaurantTableId = x.Order.RestaurantTableId,
                RestaurantTableName = x.RestaurantTableName,
                OrderCode = x.Order.OrderCode,
                Status = x.Order.Status,
                TotalAmount = x.Order.TotalAmount,
                Note = x.Order.Note,
                IsActive = x.Order.IsActive,
                CreatedAt = x.Order.CreatedAt,
                UpdatedAt = x.Order.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        foreach (var order in orders)
        {
            order.Items = await _context.OrderItems
                .Where(x => x.OrderId == order.Id)
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
        }

        return orders;
    }
}