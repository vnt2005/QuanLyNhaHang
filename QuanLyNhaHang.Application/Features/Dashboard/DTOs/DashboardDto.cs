namespace QuanLyNhaHang.Application.Features.Dashboard.DTOs;

public class DashboardDto
{
    public DashboardOverviewDto Overview { get; set; } = new();

    public List<DashboardRevenueChartDto> RevenueChart { get; set; } = new();

    public List<DashboardTopSellingItemDto> TopSellingItems { get; set; } = new();

    public List<DashboardLowStockIngredientDto> LowStockIngredients { get; set; } = new();
}