namespace QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

public class RevenueReportSummaryDto
{
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

    public List<RevenueReportSummaryItemDto> Items { get; set; } = new();
}