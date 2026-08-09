using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetWithPaginatedList;

public class GetPaymentsWithPaginatedListQueryHandler
    : IRequestHandler<GetPaymentsWithPaginatedListQuery, PaymentPaginatedResultDto>
{
    private readonly IApplicationDbContext _context;

    public GetPaymentsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentPaginatedResultDto> Handle(
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

        var totalCount = await query.CountAsync(cancellationToken);
        var paidCount = await query.CountAsync(
            x => x.Status == "Paid",
            cancellationToken);
        var cancelledCount = await query.CountAsync(
            x => x.Status == "Cancelled",
            cancellationToken);
        var revenue = await query
            .Where(x => x.Status == "Paid")
            .SumAsync(
                x => (decimal?)x.FinalAmount,
                cancellationToken) ?? 0m;

        var pageSize = Math.Clamp(request.PageSize, 1, 100);
        var totalPages = Math.Max(
            1,
            (int)Math.Ceiling(totalCount / (double)pageSize));
        var pageNumber = Math.Clamp(
            request.PageNumber,
            1,
            totalPages);

        var items = await query
            .OrderByDescending(x => x.PaidAt)
            .ThenByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
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
            })
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PaymentPaginatedResultDto
        {
            Items = items,
            PageNumber = pageNumber,
            TotalPages = totalPages,
            TotalCount = totalCount,
            PaidCount = paidCount,
            CancelledCount = cancelledCount,
            Revenue = revenue
        };
    }
}