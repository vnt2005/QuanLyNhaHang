namespace QuanLyNhaHang.Application.Features.Dashboard.DTOs;

public class DashboardTopSellingItemDto
{
    public Guid MenuItemId { get; set; }

    public string MenuItemName { get; set; } = string.Empty;

    public int QuantitySold { get; set; }

    public decimal TotalRevenue { get; set; }
}