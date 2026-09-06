using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetById;

public class GetPaymentByIdQueryHandler
    : IRequestHandler<GetPaymentByIdQuery, PaymentDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPaymentByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentDto?> Handle(
        GetPaymentByIdQuery request,
        CancellationToken cancellationToken)
    {
        var payment = await VerifiedSePayPaymentPolicy.Apply(
                _context.Payments.AsNoTracking(),
                _context)
            .Where(x => x.Id == request.Id)
            .Select(x => new PaymentDto
            {
                Id = x.Id,
                OrderId = x.OrderId,
                PaymentCode = x.PaymentCode,
                TotalAmount = x.TotalAmount,
                DiscountAmount = x.DiscountAmount,
                ServiceChargeAmount = x.FinalAmount - x.TotalAmount +
                    x.DiscountAmount - x.VatAmount,
                VatAmount = x.VatAmount,
                FinalAmount = x.FinalAmount,
                CustomerPaid = x.CustomerPaid,
                ChangeAmount = x.ChangeAmount,
                PaymentMethod = x.PaymentMethod,
                Status = x.Status,
                Note = x.Note,
                PaidAt = x.PaidAt,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return payment;
    }
}
