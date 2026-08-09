using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Payments.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Payments.Commands.Create;

public class CreatePaymentCommandHandler
    : IRequestHandler<CreatePaymentCommand, PaymentDto>
{
    private readonly IApplicationDbContext _context;

    public CreatePaymentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentDto> Handle(
        CreatePaymentCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.OrderId, cancellationToken);

        if (order == null)
            throw new KeyNotFoundException("Không tìm thấy đơn hàng.");

        if (order.Status == "Completed")
            throw new InvalidOperationException("Đơn hàng này đã hoàn tất thanh toán.");

        if (order.Status == "Cancelled")
            throw new InvalidOperationException("Đơn hàng đã hủy, không thể thanh toán.");

        var existedPayment = await _context.Payments
            .AnyAsync(x =>
                x.OrderId == request.OrderId &&
                x.Status == "Paid",
                cancellationToken);

        if (existedPayment)
            throw new InvalidOperationException("Đơn hàng này đã được thanh toán.");

        var orderItems = await _context.OrderItems
            .Where(x =>
                x.OrderId == request.OrderId &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        if (!orderItems.Any())
            throw new InvalidOperationException("Đơn hàng chưa có món để thanh toán.");

        var hasUnfinishedItems = orderItems.Any(x =>
            x.Status == "Pending" ||
            x.Status == "Cooking");

        if (hasUnfinishedItems)
            throw new InvalidOperationException(
                "Đơn hàng còn món chưa hoàn thành, chưa thể thanh toán.");

        foreach (var item in orderItems)
        {
            if (item.Status == "Ready")
            {
                item.MarkServed();
            }
        }

        var totalAmount = orderItems.Sum(x => x.TotalPrice);

        var appliedPromotionUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(x =>
                x.OrderId == request.OrderId &&
                x.Status == "Applied",
                cancellationToken);

        var discountAmount = appliedPromotionUsage?.DiscountAmount
            ?? request.DiscountAmount;

        var payment = new Payment(
            request.OrderId,
            totalAmount,
            discountAmount,
            request.VatAmount,
            request.CustomerPaid,
            request.PaymentMethod,
            request.Note,
            request.ServiceChargeAmount);

        await _context.Payments.AddAsync(payment, cancellationToken);

        if (appliedPromotionUsage != null)
        {
            appliedPromotionUsage.SetPayment(payment.Id);
        }

        order.UpdateTotalAmount(totalAmount);
        order.MarkCompleted();

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == order.RestaurantTableId, cancellationToken);

        if (table != null)
        {
            table.MarkAvailable();
        }

        // Nếu IssueInvoice = true thì thanh toán xong tự động tạo hóa đơn.
        if (request.IssueInvoice)
        {
            if (table == null)
                throw new KeyNotFoundException("Không tìm thấy bàn để xuất hóa đơn.");

            var existedInvoice = await _context.Invoices
                .AnyAsync(x =>
                    (x.OrderId == order.Id || x.PaymentId == payment.Id) &&
                    x.Status != "Cancelled",
                    cancellationToken);

            if (existedInvoice)
                throw new InvalidOperationException(
                    "Đơn hàng hoặc thanh toán này đã có hóa đơn.");

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
                request.Note ?? "Xuất hóa đơn tự động sau thanh toán");

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
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new PaymentDto
        {
            Id = payment.Id,
            OrderId = payment.OrderId,
            PaymentCode = payment.PaymentCode,
            TotalAmount = payment.TotalAmount,
            DiscountAmount = payment.DiscountAmount,
            ServiceChargeAmount = payment.ServiceChargeAmount,
            VatAmount = payment.VatAmount,
            FinalAmount = payment.FinalAmount,
            CustomerPaid = payment.CustomerPaid,
            ChangeAmount = payment.ChangeAmount,
            PaymentMethod = payment.PaymentMethod,
            Status = payment.Status,
            Note = payment.Note,
            PaidAt = payment.PaidAt,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        };
    }
}
