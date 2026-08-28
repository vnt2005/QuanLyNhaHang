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

        if (payment.Status == "Cancelled")
            return true;

        if (payment.Status == "Paid")
        {
            throw new InvalidOperationException(
                "Thanh toán đã được ghi nhận Paid và đã chốt vào hóa đơn/báo cáo. Không thể hủy trực tiếp vì thao tác này không hoàn tiền cho khách. Hãy thực hiện đối soát hoặc quy trình hoàn tiền riêng.");
        }

        payment.Cancel();

        var activeInvoices = await _context.Invoices
            .Where(x =>
                x.PaymentId == payment.Id &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        foreach (var invoice in activeInvoices)
            invoice.Cancel();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
