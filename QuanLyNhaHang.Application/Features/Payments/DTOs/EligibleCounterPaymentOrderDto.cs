namespace QuanLyNhaHang.Application.Features.Payments.DTOs;

public sealed class EligibleCounterPaymentOrderDto
{
    public Guid Id { get; set; }

    public string OrderCode { get; set; } = string.Empty;

    public string OrderType { get; set; } = string.Empty;

    public string RestaurantTableName { get; set; } = string.Empty;

    public string? CustomerName { get; set; }

    public string Status { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }
}
