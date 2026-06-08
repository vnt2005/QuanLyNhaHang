using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.CancelOrderItem;

public class CancelOrderItemCommandHandler
    : IRequestHandler<CancelOrderItemCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public CancelOrderItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        CancelOrderItemCommand request,
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
            throw new Exception("Không thể hủy món trong order đã hoàn tất.");
        }

        if (order.Status == "Cancelled")
        {
            throw new Exception("Không thể hủy món trong order đã hủy.");
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
            throw new Exception("Món này đã được hủy trước đó.");
        }

        orderItem.Cancel();

        var totalAmount = orderItems
            .Where(x => x.Status != "Cancelled")
            .Sum(x => x.TotalPrice);

        order.UpdateTotalAmount(totalAmount);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}