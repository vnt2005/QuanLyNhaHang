namespace QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

public class RevenueReportDto
{
    public Guid Id { get; set; }

    public string ReportCode { get; set; } = string.Empty;

    public DateTime FromDate { get; set; }

    public DateTime ToDate { get; set; }

    public int TotalInvoices { get; set; }

    public int TotalOrders { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal TotalDiscountAmount { get; set; }

    public decimal TotalVatAmount { get; set; }

    public decimal TotalRevenue { get; set; }

    public decimal TotalCustomerPaid { get; set; }

    public decimal TotalChangeAmount { get; set; }

    public decimal AverageRevenuePerInvoice { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateTime GeneratedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<RevenueReportItemDto> Items { get; set; } = new();
}