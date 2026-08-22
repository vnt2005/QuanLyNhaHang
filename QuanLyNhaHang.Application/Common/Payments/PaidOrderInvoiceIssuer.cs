using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Common.Payments;

public sealed record PaidOrderInvoiceIssue(
    Invoice Invoice,
    IReadOnlyList<InvoiceItem> Items);

public static class PaidOrderInvoiceIssuer
{
    public static async Task<PaidOrderInvoiceIssue> IssueAsync(
        IApplicationDbContext context,
        Order order,
        Payment payment,
        string? note,
        CancellationToken cancellationToken)
    {
        if (payment.Status != "Paid")
            throw new InvalidOperationException(
                "Chỉ thanh toán đã hoàn tất mới được phát hành hóa đơn.");

        if (payment.OrderId != order.Id)
            throw new InvalidOperationException(
                "Thanh toán không thuộc đơn hàng cần phát hành hóa đơn.");

        var hasActiveInvoice = await context.Invoices.AnyAsync(
            invoice =>
                (invoice.OrderId == order.Id ||
                 invoice.PaymentId == payment.Id) &&
                invoice.Status != "Cancelled",
            cancellationToken);

        if (hasActiveInvoice)
            throw new InvalidOperationException(
                "Đơn hàng hoặc thanh toán này đã có hóa đơn.");

        var tableName = "Mang về";
        if (order.RestaurantTableId.HasValue)
        {
            tableName = await context.RestaurantTables
                .AsNoTracking()
                .Where(table => table.Id == order.RestaurantTableId.Value)
                .Select(table => table.Name)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new KeyNotFoundException("Không tìm thấy bàn.");
        }

        var orderItems = await context.OrderItems
            .Where(item =>
                item.OrderId == order.Id &&
                item.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        if (orderItems.Count == 0)
            throw new InvalidOperationException(
                "Đơn hàng chưa có món hợp lệ để phát hành hóa đơn.");

        var invoice = new Invoice(
            order.Id,
            payment.Id,
            order.RestaurantTableId,
            order.OrderCode,
            payment.PaymentCode,
            tableName,
            payment.TotalAmount,
            payment.DiscountAmount,
            payment.VatAmount,
            payment.FinalAmount,
            payment.CustomerPaid,
            payment.ChangeAmount,
            payment.PaymentMethod,
            note);

        await context.Invoices.AddAsync(invoice, cancellationToken);

        var invoiceItems = orderItems.Select(item => new InvoiceItem(
            invoice.Id,
            item.Id,
            item.MenuItemId,
            item.MenuItemName,
            item.Quantity,
            item.UnitPrice,
            item.TotalPrice,
            item.Note)).ToList();

        await context.InvoiceItems.AddRangeAsync(
            invoiceItems,
            cancellationToken);

        return new PaidOrderInvoiceIssue(invoice, invoiceItems);
    }
}
