using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

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

        var isSettledOnlinePayment = await _context.PaymentAttempts
            .AsNoTracking()
            .AnyAsync(
                attempt =>
                    attempt.PaymentId == payment.Id &&
                    attempt.Status == PaymentAttempt.PaidStatus,
                cancellationToken);

        if (isSettledOnlinePayment)
        {
            throw new InvalidOperationException(
                "Thanh toán online đã được ngân hàng/SePay ghi nhận. " +
                "Không thể hủy trực tiếp trong hệ thống vì thao tác này không hoàn tiền cho khách. " +
                "Hãy thực hiện đối soát hoặc quy trình hoàn tiền riêng.");
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
