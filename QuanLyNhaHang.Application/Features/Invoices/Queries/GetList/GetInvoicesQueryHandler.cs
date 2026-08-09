using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Queries.GetList;

public class GetInvoicesQueryHandler
    : IRequestHandler<GetInvoicesQuery, List<InvoiceDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInvoicesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<InvoiceDto>> Handle(
        GetInvoicesQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Invoices
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

        return await query
            .OrderByDescending(x => x.IssuedAt)
            .Select(x => new InvoiceDto
            {
                Id = x.Id,
                OrderId = x.OrderId,
                PaymentId = x.PaymentId,
                RestaurantTableId = x.RestaurantTableId,
                InvoiceCode = x.InvoiceCode,
                OrderCode = x.OrderCode,
                PaymentCode = x.PaymentCode,
                RestaurantTableName = x.RestaurantTableName,
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
                IssuedAt = x.IssuedAt,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }
}