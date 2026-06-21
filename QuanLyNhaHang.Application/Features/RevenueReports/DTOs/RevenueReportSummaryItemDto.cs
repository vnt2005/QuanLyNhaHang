namespace QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

public class RevenueReportSummaryItemDto
{
    public Guid MenuItemId { get; set; }

    public string MenuItemName { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalRevenue { get; set; }
}