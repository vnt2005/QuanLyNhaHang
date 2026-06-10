namespace QuanLyNhaHang.Application.Features.Dashboard.DTOs;

public class DashboardOverviewDto
{
    public decimal TodayRevenue { get; set; }

    public int TodayOrders { get; set; }

    public int TodayInvoices { get; set; }

    public int TodayPayments { get; set; }

    public decimal TodayDiscountAmount { get; set; }

    public decimal TodayVatAmount { get; set; }

    public int PendingOrders { get; set; }

    public int CookingOrders { get; set; }

    public int ServedOrders { get; set; }

    public int CompletedOrders { get; set; }

    public int CancelledOrders { get; set; }

    public int AvailableTables { get; set; }

    public int OccupiedTables { get; set; }

    public int ReservedTables { get; set; }

    public int CleaningTables { get; set; }

    public int PendingKitchenItems { get; set; }

    public int CookingKitchenItems { get; set; }

    public int ReadyKitchenItems { get; set; }

    public int ServedKitchenItems { get; set; }

    public int TodayReservations { get; set; }

    public int PendingReservations { get; set; }

    public int ConfirmedReservations { get; set; }

    public int LowStockIngredients { get; set; }

    public int TodayActivityLogs { get; set; }

    public int TodayFailedActivityLogs { get; set; }
}