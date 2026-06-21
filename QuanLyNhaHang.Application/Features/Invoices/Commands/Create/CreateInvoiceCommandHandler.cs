using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
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
        var payment = await _context.Payments
            .FirstOrDefaultAsync(x => x.Id == request.PaymentId, cancellationToken);

        if (payment == null)
            throw new Exception("Không tìm thấy thanh toán.");

        if (payment.Status != "Paid")
            throw new Exception("Chỉ thanh toán đã Paid mới được xuất hóa đơn.");

        var existedInvoice = await _context.Invoices
            .AnyAsync(x => x.PaymentId == request.PaymentId && x.Status != "Cancelled", cancellationToken);

        if (existedInvoice)
            throw new Exception("Thanh toán này đã có hóa đơn.");

        // THÊM MỚI:
        // Chặn trường hợp một order bị xuất nhiều hóa đơn
        var existedInvoiceByOrder = await _context.Invoices
            .AnyAsync(x =>
        x.OrderId == payment.OrderId &&
        x.Status != "Cancelled",
        cancellationToken);

        if (existedInvoiceByOrder)
            throw new Exception("Đơn hàng này đã được xuất hóa đơn.");

        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == payment.OrderId, cancellationToken);

        if (order == null)
            throw new Exception("Không tìm thấy order.");

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == order.RestaurantTableId, cancellationToken);

        if (table == null)
            throw new Exception("Không tìm thấy bàn.");

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == order.Id && x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        if (!orderItems.Any())
            throw new Exception("Order chưa có món để xuất hóa đơn.");

        var invoice = new Invoice(
            order.Id,
            payment.Id,
            order.RestaurantTableId,
            order.OrderCode,
            payment.PaymentCode,
            table.Name,
            payment.TotalAmount,
            payment.DiscountAmount,
            payment.VatAmount,
            payment.FinalAmount,
            payment.CustomerPaid,
            payment.ChangeAmount,
            payment.PaymentMethod,
            request.Note);

        await _context.Invoices.AddAsync(invoice, cancellationToken);

        var invoiceItems = orderItems.Select(item => new InvoiceItem(
            invoice.Id,
            item.Id,
            item.MenuItemId,
            item.MenuItemName,
            item.Quantity,
            item.UnitPrice,
            item.TotalPrice,
            item.Note)).ToList();

        await _context.InvoiceItems.AddRangeAsync(invoiceItems, cancellationToken);

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