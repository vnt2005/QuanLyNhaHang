using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Kitchen.Dtos;

namespace QuanLyNhaHang.Application.Features.Kitchen.Queries.GetList;

public class GetKitchenHistoryQueryHandler
    : IRequestHandler<GetKitchenHistoryQuery, List<KitchenOrderDto>>
{
    private readonly IApplicationDbContext _context;

    public GetKitchenHistoryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<KitchenOrderDto>> Handle(
        GetKitchenHistoryQuery request,
        CancellationToken cancellationToken)
    {
        var historyStatuses = new[] { "Served", "Cancelled" };

        var rows = await (
            from order in _context.Orders.AsNoTracking()
            join table in _context.RestaurantTables.AsNoTracking()
                on order.RestaurantTableId equals table.Id
            join orderItem in _context.OrderItems.AsNoTracking()
                on order.Id equals orderItem.OrderId
            where historyStatuses.Contains(orderItem.Status)
            orderby orderItem.UpdatedAt descending
            select new
            {
                OrderId = order.Id,
                order.OrderCode,
                order.RestaurantTableId,
                RestaurantTableName = table.Name,
                OrderStatus = order.Status,
                OrderCreatedAt = order.CreatedAt,

                OrderItemId = orderItem.Id,
                orderItem.MenuItemId,
                orderItem.MenuItemName,
                orderItem.Quantity,
                orderItem.UnitPrice,
                orderItem.TotalPrice,
                OrderItemStatus = orderItem.Status,
                orderItem.Note,
                OrderItemCreatedAt = orderItem.CreatedAt,
                orderItem.UpdatedAt,
                orderItem.StartedAt,
                orderItem.CompletedAt
            }
        ).ToListAsync(cancellationToken);

        var result = rows
            .GroupBy(x => new
            {
                x.OrderId,
                x.OrderCode,
                x.RestaurantTableId,
                x.RestaurantTableName,
                x.OrderStatus,
                x.OrderCreatedAt
            })
            .Select(g => new KitchenOrderDto
            {
                OrderId = g.Key.OrderId,
                OrderCode = g.Key.OrderCode,
                RestaurantTableId = g.Key.RestaurantTableId,
                RestaurantTableName = g.Key.RestaurantTableName,
                OrderStatus = g.Key.OrderStatus,
                CreatedAt = g.Key.OrderCreatedAt,

                Items = g.Select(i => new KitchenOrderItemDto
                {
                    OrderItemId = i.OrderItemId,
                    MenuItemId = i.MenuItemId,
                    MenuItemName = i.MenuItemName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TotalPrice = i.TotalPrice,
                    Status = i.OrderItemStatus,
                    Note = i.Note,
                    CreatedAt = i.OrderItemCreatedAt,
                    UpdatedAt = i.UpdatedAt,
                    StartedAt = i.StartedAt,
                    CompletedAt = i.CompletedAt
                }).ToList()
            })
            .ToList();

        return result;
    }
}