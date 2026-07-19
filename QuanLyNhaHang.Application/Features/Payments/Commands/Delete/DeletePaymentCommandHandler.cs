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
        {
            throw new KeyNotFoundException(
                "Không tìm thấy thanh toán.");
        }

        var order = await _context.Orders
            .FirstOrDefaultAsync(
                x => x.Id == payment.OrderId,
                cancellationToken);

        if (order == null)
        {
            throw new InvalidOperationException(
                "Không tìm thấy order của thanh toán.");
        }

        var activeInvoices = await _context.Invoices
            .Where(x =>
                x.PaymentId == payment.Id &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        payment.Cancel();

        foreach (var invoice in activeInvoices)
        {
            invoice.Cancel();
        }

        if (order.Status == "Completed")
        {
            order.MarkServed();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
