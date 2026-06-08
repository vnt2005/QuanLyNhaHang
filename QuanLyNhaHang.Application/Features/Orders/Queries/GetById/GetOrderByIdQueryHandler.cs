using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Orders.DTOs;
namespace QuanLyNhaHang.Application.Features.Orders.Queries.GetById;

public class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, OrderDto?>
{
    private readonly IApplicationDbContext _context;

    public GetOrderByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDto?> Handle(
        GetOrderByIdQuery request,
        CancellationToken cancellationToken)
    {
        var order = await (
            from o in _context.Orders
            join table in _context.RestaurantTables
                on o.RestaurantTableId equals table.Id
            where o.Id == request.Id
            select new OrderDto
            {
                Id = o.Id,
                RestaurantTableId = o.RestaurantTableId,
                RestaurantTableName = table.Name,
                OrderCode = o.OrderCode,
                Status = o.Status,
                TotalAmount = o.TotalAmount,
                Note = o.Note,
                IsActive = o.IsActive,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (order == null)
        {
            return null;
        }

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

        return order;
    }
}