namespace QuanLyNhaHang.Domain.Entities;

public class RevenueReport
{
    public Guid Id { get; private set; }

    public string ReportCode { get; private set; } = string.Empty;

    public DateTime FromDate { get; private set; }

    public DateTime ToDate { get; private set; }

    public int TotalInvoices { get; private set; }

    public int TotalOrders { get; private set; }

    public decimal TotalAmount { get; private set; }

    public decimal TotalDiscountAmount { get; private set; }

    public decimal TotalVatAmount { get; private set; }

    public decimal TotalRevenue { get; private set; }

    public decimal TotalCustomerPaid { get; private set; }

    public decimal TotalChangeAmount { get; private set; }

    public decimal AverageRevenuePerInvoice { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTime GeneratedAt { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected RevenueReport()
    {
    }

    public RevenueReport(
        DateTime fromDate,
        DateTime toDate,
        int totalInvoices,
        int totalOrders,
        decimal totalAmount,
        decimal totalDiscountAmount,
        decimal totalVatAmount,
        decimal totalRevenue,
        decimal totalCustomerPaid,
        decimal totalChangeAmount,
        string? note)
    {
        Id = Guid.NewGuid();

        SetDateRange(fromDate, toDate);
        SetTotals(
            totalInvoices,
            totalOrders,
            totalAmount,
            totalDiscountAmount,
            totalVatAmount,
            totalRevenue,
            totalCustomerPaid,
            totalChangeAmount);

        SetNote(note);

        ReportCode = GenerateReportCode();
        Status = "Generated";
        GeneratedAt = DateTime.UtcNow;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateNote(string? note)
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Báo cáo đã hủy, không thể cập nhật.");

        SetNote(note);
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkExported()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Báo cáo đã hủy, không thể xuất file.");

        Status = "Exported";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkPrinted()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Báo cáo đã hủy, không thể in.");

        Status = "Printed";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Báo cáo đã được hủy trước đó.");

        Status = "Cancelled";
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetDateRange(DateTime fromDate, DateTime toDate)
    {
        fromDate = fromDate.Date;
        toDate = toDate.Date;

        if (fromDate > toDate)
            throw new ArgumentException("Ngày bắt đầu không được lớn hơn ngày kết thúc.");

        FromDate = fromDate;
        ToDate = toDate;
    }

    private void SetTotals(
        int totalInvoices,
        int totalOrders,
        decimal totalAmount,
        decimal totalDiscountAmount,
        decimal totalVatAmount,
        decimal totalRevenue,
        decimal totalCustomerPaid,
        decimal totalChangeAmount)
    {
        if (totalInvoices < 0)
            throw new ArgumentException("Tổng số hóa đơn không hợp lệ.");

        if (totalOrders < 0)
            throw new ArgumentException("Tổng số order không hợp lệ.");

        if (totalAmount < 0)
            throw new ArgumentException("Tổng tiền không được nhỏ hơn 0.");

        if (totalDiscountAmount < 0)
            throw new ArgumentException("Tổng giảm giá không được nhỏ hơn 0.");

        if (totalVatAmount < 0)
            throw new ArgumentException("Tổng VAT không được nhỏ hơn 0.");

        if (totalRevenue < 0)
            throw new ArgumentException("Tổng doanh thu không được nhỏ hơn 0.");

        if (totalCustomerPaid < 0)
            throw new ArgumentException("Tổng tiền khách đưa không được nhỏ hơn 0.");

        if (totalChangeAmount < 0)
            throw new ArgumentException("Tổng tiền thối không được nhỏ hơn 0.");

        TotalInvoices = totalInvoices;
        TotalOrders = totalOrders;
        TotalAmount = totalAmount;
        TotalDiscountAmount = totalDiscountAmount;
        TotalVatAmount = totalVatAmount;
        TotalRevenue = totalRevenue;
        TotalCustomerPaid = totalCustomerPaid;
        TotalChangeAmount = totalChangeAmount;
        AverageRevenuePerInvoice = totalInvoices == 0
            ? 0
            : totalRevenue / totalInvoices;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }

    private static string GenerateReportCode()
    {
        return $"REV-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }
}