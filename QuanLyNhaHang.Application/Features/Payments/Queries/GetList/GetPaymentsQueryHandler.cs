using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetList;

public class GetPaymentsQueryHandler
    : IRequestHandler<GetPaymentsQuery, List<PaymentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPaymentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PaymentDto>> Handle(
        GetPaymentsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Payments
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.PaymentMethod))
        {
            query = query.Where(x => x.PaymentMethod == request.PaymentMethod);
        }

        var payments = await query
            .OrderByDescending(x => x.PaidAt)
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
            .ToListAsync(cancellationToken);

        return payments;
    }
}