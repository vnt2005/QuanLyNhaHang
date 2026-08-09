using MediatR;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Commands.Create;

public class CreatePaymentCommand : IRequest<PaymentDto>
{
    public Guid OrderId { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal ServiceChargeAmount { get; set; }

    public decimal VatAmount { get; set; }

    public decimal CustomerPaid { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public string? Note { get; set; }

    // THÊM MỚI:
    // true  = Thanh toán xong tự động xuất hóa đơn
    // false = Chỉ thanh toán, chưa xuất hóa đơn
    public bool IssueInvoice { get; set; } = true;
}