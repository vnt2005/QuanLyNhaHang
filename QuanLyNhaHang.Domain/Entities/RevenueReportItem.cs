namespace QuanLyNhaHang.Domain.Entities;

public class RevenueReportItem
{
    public Guid Id { get; private set; }

    public Guid RevenueReportId { get; private set; }

    public Guid MenuItemId { get; private set; }

    public string MenuItemName { get; private set; } = string.Empty;

    public int QuantitySold { get; private set; }

    public decimal TotalRevenue { get; private set; }

    public DateTime CreatedAt { get; private set; }

    protected RevenueReportItem()
    {
    }

    public RevenueReportItem(
        Guid revenueReportId,
        Guid menuItemId,
        string menuItemName,
        int quantitySold,
        decimal totalRevenue)
    {
        Id = Guid.NewGuid();

        SetRevenueReportId(revenueReportId);
        SetMenuItemId(menuItemId);
        SetMenuItemName(menuItemName);
        SetQuantitySold(quantitySold);
        SetTotalRevenue(totalRevenue);

        CreatedAt = DateTime.UtcNow;
    }

    private void SetRevenueReportId(Guid revenueReportId)
    {
        if (revenueReportId == Guid.Empty)
            throw new ArgumentException("Báo cáo doanh thu không hợp lệ.");

        RevenueReportId = revenueReportId;
    }

    private void SetMenuItemId(Guid menuItemId)
    {
        if (menuItemId == Guid.Empty)
            throw new ArgumentException("Món ăn không hợp lệ.");

        MenuItemId = menuItemId;
    }

    private void SetMenuItemName(string menuItemName)
    {
        if (string.IsNullOrWhiteSpace(menuItemName))
            throw new ArgumentException("Tên món ăn không được để trống.");

        MenuItemName = menuItemName.Trim();
    }

    private void SetQuantitySold(int quantitySold)
    {
        if (quantitySold < 0)
            throw new ArgumentException("Số lượng bán không hợp lệ.");

        QuantitySold = quantitySold;
    }

    private void SetTotalRevenue(decimal totalRevenue)
    {
        if (totalRevenue < 0)
            throw new ArgumentException("Doanh thu món không được nhỏ hơn 0.");

        TotalRevenue = totalRevenue;
    }
}