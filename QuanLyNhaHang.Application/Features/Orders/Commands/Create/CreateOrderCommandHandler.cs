using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.Create;

public class CreateOrderCommandHandler : IRequestHandler<CreateOrderCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateOrderCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Items == null || !request.Items.Any())
        {
            throw new Exception("Order phải có ít nhất một món.");
        }

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(
                x => x.Id == request.RestaurantTableId && x.IsActive,
                cancellationToken);

        if (table == null)
        {
            throw new Exception("Bàn không tồn tại hoặc đã ngừng hoạt động.");
        }

        if (table.Status == "Occupied")
        {
            throw new Exception("Bàn này đang có khách.");
        }

        var orderCode = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}";

        var order = new Order(
            request.RestaurantTableId,
            orderCode,
            request.Note);

        var orderItems = new List<OrderItem>();

        foreach (var itemRequest in request.Items)
        {
            if (itemRequest.Quantity <= 0)
            {
                throw new Exception("Số lượng món phải lớn hơn 0.");
            }

            var menuItem = await _context.MenuItems
                .FirstOrDefaultAsync(
                    x => x.Id == itemRequest.MenuItemId &&
                         x.IsActive &&
                         x.IsAvailable,
                    cancellationToken);

            if (menuItem == null)
            {
                throw new Exception("Món ăn không tồn tại, đã ẩn hoặc đang hết món.");
            }

            var orderItem = new OrderItem(
                order.Id,
                menuItem.Id,
                menuItem.Name,
                itemRequest.Quantity,
                menuItem.Price,
                itemRequest.Note);

            orderItems.Add(orderItem);
        }

        var totalAmount = orderItems.Sum(x => x.TotalPrice);

        order.UpdateTotalAmount(totalAmount);

        table.MarkOccupied();

        _context.Orders.Add(order);
        _context.OrderItems.AddRange(orderItems);

        await _context.SaveChangesAsync(cancellationToken);

        return order.Id;
    }
}