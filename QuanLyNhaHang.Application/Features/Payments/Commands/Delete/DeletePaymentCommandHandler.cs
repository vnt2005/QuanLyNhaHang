using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Payments.Commands.Delete;

public class DeletePaymentCommandHandler
    : IRequestHandler<DeletePaymentCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeletePaymentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeletePaymentCommand request,
        CancellationToken cancellationToken)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (payment == null)
            throw new Exception("Không tìm thấy thanh toán.");

        payment.Cancel();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}