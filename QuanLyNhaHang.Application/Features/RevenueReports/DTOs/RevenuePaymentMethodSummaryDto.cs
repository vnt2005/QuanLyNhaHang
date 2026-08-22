namespace QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

public class RevenuePaymentMethodSummaryDto
{
    public string PaymentMethod { get; set; } = string.Empty;

    public int PaymentCount { get; set; }

    public decimal TotalAmount { get; set; }
}
