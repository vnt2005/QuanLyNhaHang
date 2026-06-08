using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

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

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}