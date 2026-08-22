using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
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

        if (request.Items.Count > 50)
            throw new ArgumentException("Một order không được vượt quá 50 dòng món.");

        var table = await _context.RestaurantTables
            .WhereSelectableForOrder(_context)
            .FirstOrDefaultAsync(
                x => x.Id == request.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new InvalidOperationException(
                "Bàn không tồn tại, đã ngừng hoạt động, đang vệ sinh hoặc đã có đơn chưa hoàn tất.");
        }

        var orderCode = GenerateOrderCode();

        var order = new Order(
            request.RestaurantTableId,
            orderCode,
            request.Note);

        var orderItems = new List<OrderItem>();

        foreach (var itemRequest in request.Items)
        {
            if (itemRequest.Quantity is <= 0 or > 99)
            {
                throw new ArgumentException(
                    "Số lượng mỗi món phải từ 1 đến 99.");
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

    private static string GenerateOrderCode()
        => $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}-" +
           Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
}
