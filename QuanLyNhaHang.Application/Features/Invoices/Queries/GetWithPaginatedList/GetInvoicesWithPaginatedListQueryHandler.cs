using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Queries.GetWithPaginatedList;

public class GetInvoicesWithPaginatedListQueryHandler
    : IRequestHandler<GetInvoicesWithPaginatedListQuery, PaginatedList<InvoiceDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInvoicesWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<InvoiceDto>> Handle(
        GetInvoicesWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Invoices
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.InvoiceCode.Contains(keyword) ||
                x.OrderCode.Contains(keyword) ||
                x.PaymentCode.Contains(keyword) ||
                x.RestaurantTableName.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.PaymentMethod))
        {
            query = query.Where(x => x.PaymentMethod == request.PaymentMethod);
        }

        var invoiceDtos = query
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
            });

        return await PaginatedList<InvoiceDto>.CreateAsync(
            invoiceDtos,
            request.PageNumber,
            request.PageSize);
    }
}