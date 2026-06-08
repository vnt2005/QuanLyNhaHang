namespace QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

public class RevenueReportItemDto
{
    public Guid Id { get; set; }

    public Guid RevenueReportId { get; set; }

    public Guid MenuItemId { get; set; }

    public string MenuItemName { get; set; } = string.Empty;

    public int QuantitySold { get; set; }

    public decimal TotalRevenue { get; set; }

    public DateTime CreatedAt { get; set; }
}