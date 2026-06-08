using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Commands.Update;

public class UpdateInvoiceCommandHandler
    : IRequestHandler<UpdateInvoiceCommand, InvoiceDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateInvoiceCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InvoiceDto> Handle(
        UpdateInvoiceCommand request,
        CancellationToken cancellationToken)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (invoice == null)
            throw new Exception("Không tìm thấy hóa đơn.");

        invoice.UpdateNote(request.Note);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            switch (request.Status)
            {
                case "Printed":
                    invoice.MarkPrinted();
                    break;

                case "Cancelled":
                    invoice.Cancel();
                    break;

                case "Issued":
                    break;

                default:
                    throw new Exception("Trạng thái hóa đơn không hợp lệ.");
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new InvoiceDto
        {
            Id = invoice.Id,
            OrderId = invoice.OrderId,
            PaymentId = invoice.PaymentId,
            RestaurantTableId = invoice.RestaurantTableId,
            InvoiceCode = invoice.InvoiceCode,
            OrderCode = invoice.OrderCode,
            PaymentCode = invoice.PaymentCode,
            RestaurantTableName = invoice.RestaurantTableName,
            TotalAmount = invoice.TotalAmount,
            DiscountAmount = invoice.DiscountAmount,
            VatAmount = invoice.VatAmount,
            FinalAmount = invoice.FinalAmount,
            CustomerPaid = invoice.CustomerPaid,
            ChangeAmount = invoice.ChangeAmount,
            PaymentMethod = invoice.PaymentMethod,
            Status = invoice.Status,
            Note = invoice.Note,
            IssuedAt = invoice.IssuedAt,
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt
        };
    }
}