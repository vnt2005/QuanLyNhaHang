using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

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
            throw new Exception("Order đã bị xóa hoặc ngừng hoạt động.");
        }

        if (order.Status == "Cancelled")
        {
            throw new Exception("Không thể đổi trạng thái order đã hủy.");
        }

        if (order.Status == "Completed")
        {
            throw new Exception("Không thể đổi trạng thái order đã hoàn tất.");
        }

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(
                x => x.Id == order.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new Exception("Bàn của order không tồn tại.");
        }

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        var status = request.Status.Trim();

        switch (status)
        {
            case "Pending":
                order.MarkPending();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(x => x.Status != "Cancelled"))
                {
                    item.MarkPending();
                }

                break;

            case "Cooking":
                order.MarkCooking();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(x => x.Status != "Cancelled"))
                {
                    item.MarkCooking();
                }

                break;

            case "Served":
                order.MarkServed();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(x => x.Status != "Cancelled"))
                {
                    item.MarkServed();
                }

                break;

            case "Completed":
                order.MarkCompleted();
                table.MarkAvailable();

                foreach (var item in orderItems.Where(x => x.Status != "Cancelled"))
                {
                    item.MarkServed();
                }

                break;

            case "Cancelled":
                order.Cancel();
                table.MarkAvailable();

                foreach (var item in orderItems)
                {
                    item.Cancel();
                }

                break;

            default:
                throw new Exception("Trạng thái order không hợp lệ.");
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}