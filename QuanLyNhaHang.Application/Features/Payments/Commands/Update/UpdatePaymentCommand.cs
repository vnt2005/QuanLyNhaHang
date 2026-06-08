using MediatR;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Commands.Update;

public class UpdatePaymentCommand : IRequest<PaymentDto>
{
    public Guid Id { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal VatAmount { get; set; }

    public decimal CustomerPaid { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public string? Note { get; set; }
}