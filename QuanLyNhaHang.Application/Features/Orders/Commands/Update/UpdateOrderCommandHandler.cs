using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.Update;

public class UpdateOrderCommandHandler : IRequestHandler<UpdateOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateOrderCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (order == null)
        {
            return false;
        }

        if (order.Status == "Completed")
        {
            throw new Exception("Không thể cập nhật order đã hoàn tất.");
        }

        if (order.Status == "Cancelled")
        {
            throw new Exception("Không thể cập nhật order đã hủy.");
        }

        order.UpdateInfo(request.Note);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}