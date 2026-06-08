using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.UpdateOrderItemQuantity;

public class UpdateOrderItemQuantityCommandHandler
    : IRequestHandler<UpdateOrderItemQuantityCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateOrderItemQuantityCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateOrderItemQuantityCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Quantity <= 0)
        {
            throw new Exception("Số lượng món phải lớn hơn 0.");
        }

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
            throw new Exception("Không thể sửa món trong order đã hoàn tất.");
        }

        if (order.Status == "Cancelled")
        {
            throw new Exception("Không thể sửa món trong order đã hủy.");
        }

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        var orderItem = orderItems
            .FirstOrDefault(x => x.Id == request.OrderItemId);

        if (orderItem == null)
        {
            return false;
        }

        if (orderItem.Status == "Cancelled")
        {
            throw new Exception("Không thể sửa số lượng món đã hủy.");
        }

        orderItem.UpdateQuantity(request.Quantity);

        var totalAmount = orderItems
            .Where(x => x.Status != "Cancelled")
            .Sum(x => x.TotalPrice);

        order.UpdateTotalAmount(totalAmount);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}