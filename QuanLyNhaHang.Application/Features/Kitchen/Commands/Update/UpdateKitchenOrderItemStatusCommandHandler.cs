using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Kitchen.Commands.Update;

public class UpdateKitchenOrderItemStatusCommandHandler
    : IRequestHandler<UpdateKitchenOrderItemStatusCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateKitchenOrderItemStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateKitchenOrderItemStatusCommand request,
        CancellationToken cancellationToken)
    {
        var orderItem = await _context.OrderItems
            .FirstOrDefaultAsync(x => x.Id == request.OrderItemId, cancellationToken);

        if (orderItem == null)
            throw new Exception("Không tìm thấy món trong đơn hàng.");

        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == orderItem.OrderId, cancellationToken);

        if (order == null)
            throw new Exception("Không tìm thấy đơn hàng của món.");

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == orderItem.OrderId)
            .ToListAsync(cancellationToken);

        orderItem.UpdateNote(request.Note);

        switch (request.Status)
        {
            case "Pending":
                orderItem.MarkPending();
                break;

            case "Cooking":
                orderItem.MarkCooking();
                break;

            case "Ready":
                orderItem.MarkReady();
                break;

            case "Served":
                orderItem.MarkServed();
                break;

            case "Cancelled":
                orderItem.Cancel();
                break;

            default:
                throw new Exception("Trạng thái món không hợp lệ.");
        }

        SynchronizeOrderStatus(order, orderItems);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static void SynchronizeOrderStatus(
        Order order,
        IReadOnlyCollection<OrderItem> orderItems)
    {
        var activeItems = orderItems
            .Where(x => x.Status != "Cancelled")
            .ToList();

        if (activeItems.Count == 0)
        {
            order.Cancel();
            return;
        }

        if (activeItems.All(x => x.Status == "Served"))
        {
            order.MarkServed();
            return;
        }

        if (activeItems.Any(x => x.Status is "Cooking" or "Ready" or "Served"))
        {
            order.MarkCooking();
            return;
        }

        order.MarkPending();
    }
}
