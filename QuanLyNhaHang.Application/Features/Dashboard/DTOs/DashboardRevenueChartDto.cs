namespace QuanLyNhaHang.Application.Features.Dashboard.DTOs;

public class DashboardRevenueChartDto
{
    public DateTime Date { get; set; }

    public string DateText { get; set; } = string.Empty;

    public decimal Revenue { get; set; }

    public int OrderCount { get; set; }

    public int InvoiceCount { get; set; }
}