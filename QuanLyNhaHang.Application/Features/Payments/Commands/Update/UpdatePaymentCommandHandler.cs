using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Commands.Update;

public class UpdatePaymentCommandHandler
    : IRequestHandler<UpdatePaymentCommand, PaymentDto>
{
    private readonly IApplicationDbContext _context;

    public UpdatePaymentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentDto> Handle(
        UpdatePaymentCommand request,
        CancellationToken cancellationToken)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (payment == null)
            throw new Exception("Không tìm thấy thanh toán.");

        if (payment.Status == "Cancelled")
            throw new Exception("Thanh toán đã hủy, không thể cập nhật.");

        payment.UpdateInfo(
            request.DiscountAmount,
            request.VatAmount,
            request.CustomerPaid,
            request.PaymentMethod,
            request.Note);

        var activeInvoices = await _context.Invoices
            .Where(x =>
                x.PaymentId == payment.Id &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        foreach (var invoice in activeInvoices)
        {
            invoice.UpdatePaymentSnapshot(
                payment.TotalAmount,
                payment.DiscountAmount,
                payment.VatAmount,
                payment.FinalAmount,
                payment.CustomerPaid,
                payment.ChangeAmount,
                payment.PaymentMethod);
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