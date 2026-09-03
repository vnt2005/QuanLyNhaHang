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
            throw new KeyNotFoundException("Không tìm thấy thanh toán.");

        if (payment.Status == "Cancelled")
            return true;

        if (payment.Status == "Paid")
        {
            throw new InvalidOperationException(
                "Thanh toán đã được ghi nhận Paid và không thể hủy trực tiếp vì thao tác này không hoàn tiền hay đảo giao dịch thực tế. Hãy thực hiện quy trình đối soát/hoàn tiền hoặc bút toán điều chỉnh riêng.");
        }

        payment.Cancel();
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
