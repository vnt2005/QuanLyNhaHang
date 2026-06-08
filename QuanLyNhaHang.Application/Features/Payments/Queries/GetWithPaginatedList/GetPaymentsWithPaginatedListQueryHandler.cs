using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetWithPaginatedList;

public class GetPaymentsWithPaginatedListQueryHandler
    : IRequestHandler<GetPaymentsWithPaginatedListQuery, PaginatedList<PaymentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPaymentsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<PaymentDto>> Handle(
        GetPaymentsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Payments
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.PaymentCode.Contains(keyword) ||
                x.PaymentMethod.Contains(keyword) ||
                x.Status.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.PaymentMethod))
        {
            query = query.Where(x => x.PaymentMethod == request.PaymentMethod);
        }

        var paymentDtos = query
            .OrderByDescending(x => x.PaidAt)
            .Select(x => new PaymentDto
            {
                Id = x.Id,
                OrderId = x.OrderId,
                PaymentCode = x.PaymentCode,
                TotalAmount = x.TotalAmount,
                DiscountAmount = x.DiscountAmount,
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
            });

        return await PaginatedList<PaymentDto>.CreateAsync(
            paymentDtos,
            request.PageNumber,
            request.PageSize);
    }
}