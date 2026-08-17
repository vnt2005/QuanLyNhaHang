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
            join tableRow in _context.RestaurantTables
                on o.RestaurantTableId equals (Guid?)tableRow.Id into tableRows
            from table in tableRows.DefaultIfEmpty()
            where o.Id == request.Id
            select new OrderDto
            {
                Id = o.Id,
                RestaurantTableId = o.RestaurantTableId,
                RestaurantTableName = table != null ? table.Name : "Mang về",
                OrderType = o.OrderType,
                CustomerName = o.CustomerName,
                CustomerPhoneNumber = o.CustomerPhoneNumber,
                PickupTime = o.PickupTime,
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
            return null;

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
