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
            throw new Exception("Không tìm thấy đơn hàng.");

        if (order.Status == "Completed")
            throw new Exception("Đơn hàng này đã hoàn tất thanh toán.");

        if (order.Status == "Cancelled")
            throw new Exception("Đơn hàng đã hủy, không thể thanh toán.");

        var existedPayment = await _context.Payments
            .AnyAsync(x =>
                x.OrderId == request.OrderId &&
                x.Status == "Paid",
                cancellationToken);

        if (existedPayment)
            throw new Exception("Đơn hàng này đã được thanh toán.");

        var orderItems = await _context.OrderItems
            .Where(x =>
                x.OrderId == request.OrderId &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        if (!orderItems.Any())
            throw new Exception("Đơn hàng chưa có món để thanh toán.");

        var hasUnfinishedItems = orderItems.Any(x =>
            x.Status == "Pending" ||
            x.Status == "Cooking");

        if (hasUnfinishedItems)
            throw new Exception("Đơn hàng còn món chưa hoàn thành, chưa thể thanh toán.");

        foreach (var item in orderItems)
        {
            if (item.Status == "Ready")
            {
                item.MarkServed();
            }
        }

        var totalAmount = orderItems.Sum(x => x.TotalPrice);

        var payment = new Payment(
            request.OrderId,
            totalAmount,
            request.DiscountAmount,
            request.VatAmount,
            request.CustomerPaid,
            request.PaymentMethod,
            request.Note);

        await _context.Payments.AddAsync(payment, cancellationToken);

        order.UpdateTotalAmount(totalAmount);
        order.MarkCompleted();

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == order.RestaurantTableId, cancellationToken);

        if (table != null)
        {
            table.MarkAvailable();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new PaymentDto
        {
            Id = payment.Id,
            OrderId = payment.OrderId,
            PaymentCode = payment.PaymentCode,
            TotalAmount = payment.TotalAmount,
            DiscountAmount = payment.DiscountAmount,
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