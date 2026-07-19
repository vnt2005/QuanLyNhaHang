using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.ChangeStatus;

public class ChangeOrderStatusCommandHandler
    : IRequestHandler<ChangeOrderStatusCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ChangeOrderStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        ChangeOrderStatusCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (order == null)
        {
            return false;
        }

        if (!order.IsActive)
        {
            throw new InvalidOperationException(
                "Order đã bị xóa hoặc ngừng hoạt động.");
        }

        if (order.Status == "Cancelled")
        {
            throw new InvalidOperationException(
                "Không thể đổi trạng thái order đã hủy.");
        }

        if (order.Status == "Completed")
        {
            throw new InvalidOperationException(
                "Không thể đổi trạng thái order đã hoàn tất.");
        }

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(
                x => x.Id == order.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new InvalidOperationException(
                "Bàn của order không tồn tại.");
        }

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            throw new ArgumentException(
                "Trạng thái order không được để trống.");
        }

        var status = request.Status.Trim();

        switch (status)
        {
            case "Pending":
                order.MarkPending();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(
                             x => x.Status != "Cancelled"))
                {
                    item.MarkPending();
                }

                break;

            case "Cooking":
                order.MarkCooking();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(
                             x => x.Status != "Cancelled"))
                {
                    item.MarkCooking();
                }

                break;

            case "Served":
                EnsureOrderCanBeServed(orderItems);

                order.MarkServed();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(
                             x => x.Status == "Ready"))
                {
                    item.MarkServed();
                }

                break;

            case "Completed":
                EnsureOrderCanBeCompleted(order, orderItems);

                order.MarkCompleted();
                table.MarkAvailable();
                break;

            case "Cancelled":
                if (orderItems.Any(x => x.Status == "Served"))
                {
                    throw new InvalidOperationException(
                        "Order có món đã phục vụ nên không thể hủy.");
                }

                order.Cancel();
                table.MarkAvailable();

                foreach (var item in orderItems.Where(
                             x => x.Status != "Cancelled"))
                {
                    item.Cancel();
                }

                break;

            default:
                throw new ArgumentException(
                    "Trạng thái order không hợp lệ.");
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static void EnsureOrderCanBeServed(
        IReadOnlyCollection<OrderItem> orderItems)
    {
        var activeItems = orderItems
            .Where(x => x.Status != "Cancelled")
            .ToList();

        if (activeItems.Count == 0)
        {
            throw new InvalidOperationException(
                "Order không còn món để phục vụ.");
        }

        if (activeItems.Any(x =>
                x.Status != "Ready" &&
                x.Status != "Served"))
        {
            throw new InvalidOperationException(
                "Tất cả món phải hoàn thành trước khi phục vụ order.");
        }
    }

    private static void EnsureOrderCanBeCompleted(
        Order order,
        IReadOnlyCollection<OrderItem> orderItems)
    {
        if (order.Status != "Served")
        {
            throw new InvalidOperationException(
                "Chỉ order đã phục vụ mới có thể hoàn tất.");
        }

        var activeItems = orderItems
            .Where(x => x.Status != "Cancelled")
            .ToList();

        if (activeItems.Count == 0 ||
            activeItems.Any(x => x.Status != "Served"))
        {
            throw new InvalidOperationException(
                "Tất cả món phải được phục vụ trước khi hoàn tất order.");
        }
    }
}
