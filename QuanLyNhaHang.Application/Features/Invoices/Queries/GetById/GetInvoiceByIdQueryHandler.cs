using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Queries.GetById;

public class GetInvoiceByIdQueryHandler
    : IRequestHandler<GetInvoiceByIdQuery, InvoiceDto?>
{
    private readonly IApplicationDbContext _context;

    public GetInvoiceByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InvoiceDto?> Handle(
        GetInvoiceByIdQuery request,
        CancellationToken cancellationToken)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
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
            .FirstOrDefaultAsync(cancellationToken);

        if (invoice == null)
            return null;

        invoice.Items = await _context.InvoiceItems
            .AsNoTracking()
            .Where(x => x.InvoiceId == invoice.Id)
            .Select(x => new InvoiceItemDto
            {
                Id = x.Id,
                InvoiceId = x.InvoiceId,
                OrderItemId = x.OrderItemId,
                MenuItemId = x.MenuItemId,
                MenuItemName = x.MenuItemName,
                Quantity = x.Quantity,
                UnitPrice = x.UnitPrice,
                TotalPrice = x.TotalPrice,
                Note = x.Note,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return invoice;
    }
}