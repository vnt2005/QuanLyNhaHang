using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.AddOrderItem;

public class AddOrderItemCommandHandler
    : IRequestHandler<AddOrderItemCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public AddOrderItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        AddOrderItemCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.OrderId, cancellationToken);

        if (order == null)
        {
            return false;
        }

        if (!order.IsActive)
        {
            throw new Exception("Order đã bị xóa hoặc ngừng hoạt động.");
        }

        if (order.Status == "Completed")
        {
            throw new Exception("Không thể thêm món vào order đã hoàn tất.");
        }

        if (order.Status == "Cancelled")
        {
            throw new Exception("Không thể thêm món vào order đã hủy.");
        }

        if (request.Quantity is <= 0 or > 99)
        {
            throw new ArgumentException(
                "Số lượng mỗi món phải từ 1 đến 99.");
        }

        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(
                x => x.Id == request.MenuItemId &&
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
            request.Quantity,
            menuItem.Price,
            request.Note);

        _context.OrderItems.Add(orderItem);

        var currentTotal = await _context.OrderItems
            .Where(x => x.OrderId == order.Id && x.Status != "Cancelled")
            .SumAsync(x => x.TotalPrice, cancellationToken);

        var newTotal = currentTotal + orderItem.TotalPrice;

        order.UpdateTotalAmount(newTotal);

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(
                x => x.Id == order.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new Exception("Bàn của order không tồn tại.");
        }

        table.MarkOccupied();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
