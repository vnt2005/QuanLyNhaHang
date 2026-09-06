using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Invoices.Commands.Create;

public class CreateInvoiceCommandHandler
    : IRequestHandler<CreateInvoiceCommand, InvoiceDto>
{
    private readonly IApplicationDbContext _context;

    public CreateInvoiceCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InvoiceDto> Handle(
        CreateInvoiceCommand request,
        CancellationToken cancellationToken)
    {
        var payment = await _context.Payments.FirstOrDefaultAsync(x => x.Id == request.PaymentId, cancellationToken);
        if (payment == null) throw new Exception("Không tìm thấy thanh toán.");
        if (payment.Status != "Paid") throw new Exception("Chỉ thanh toán đã Paid mới được xuất hóa đơn.");

        if (payment.PaymentMethod == "BankTransfer" &&
            !await VerifiedSePayPaymentPolicy.IsVerifiedAsync(
                payment,
                _context,
                cancellationToken))
        {
            throw new InvalidOperationException(
                "Thanh toán chuyển khoản này không có bằng chứng SePay/webhook hợp lệ. Dữ liệu thanh toán thủ công cũ không được phép dùng để xuất hóa đơn.");
        }

        if (await _context.Invoices.AnyAsync(x => x.PaymentId == request.PaymentId && x.Status != "Cancelled", cancellationToken))
            throw new Exception("Thanh toán này đã có hóa đơn.");

        if (await _context.Invoices.AnyAsync(x => x.OrderId == payment.OrderId && x.Status != "Cancelled", cancellationToken))
            throw new Exception("Đơn hàng này đã được xuất hóa đơn.");

        var order = await _context.Orders.FirstOrDefaultAsync(
            x => x.Id == payment.OrderId,
            cancellationToken);
        if (order == null) throw new Exception("Không tìm thấy order.");

        var issued = await PaidOrderInvoiceIssuer.IssueAsync(
            _context,
            order,
            payment,
            request.Note,
            cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        var invoice = issued.Invoice;
        var invoiceItems = issued.Items;

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
            ServiceChargeAmount = invoice.ServiceChargeAmount,
            VatAmount = invoice.VatAmount,
            FinalAmount = invoice.FinalAmount,
            CustomerPaid = invoice.CustomerPaid,
            ChangeAmount = invoice.ChangeAmount,
            PaymentMethod = invoice.PaymentMethod,
            Status = invoice.Status,
            Note = invoice.Note,
            IssuedAt = invoice.IssuedAt,
            CreatedAt = invoice.CreatedAt,
            UpdatedAt = invoice.UpdatedAt,
            Items = invoiceItems.Select(i => new InvoiceItemDto
            {
                Id = i.Id,
                InvoiceId = i.InvoiceId,
                OrderItemId = i.OrderItemId,
                MenuItemId = i.MenuItemId,
                MenuItemName = i.MenuItemName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                TotalPrice = i.TotalPrice,
                Note = i.Note,
                CreatedAt = i.CreatedAt
            }).ToList()
        };
    }
}
