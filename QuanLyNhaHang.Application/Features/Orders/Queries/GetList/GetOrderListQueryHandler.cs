using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Orders.DTOs;

namespace QuanLyNhaHang.Application.Features.Orders.Queries.GetList;

public class GetOrderListQueryHandler : IRequestHandler<GetOrderListQuery, List<OrderDto>>
{
    private readonly IApplicationDbContext _context;

    public GetOrderListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<OrderDto>> Handle(
        GetOrderListQuery request,
        CancellationToken cancellationToken)
    {
        var orders = await (
            from order in _context.Orders
            join tableRow in _context.RestaurantTables
                on order.RestaurantTableId equals (Guid?)tableRow.Id into tableRows
            from table in tableRows.DefaultIfEmpty()
            orderby order.CreatedAt descending
            select new OrderDto
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
                IsPaid = _context.Payments.Any(payment =>
                    payment.OrderId == order.Id && payment.Status == "Paid"),
                Note = order.Note,
                IsActive = order.IsActive,
                CreatedAt = order.CreatedAt,
                UpdatedAt = order.UpdatedAt
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
