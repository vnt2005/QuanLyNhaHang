using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Commands.Create;

public class CreateRevenueReportCommandHandler
    : IRequestHandler<CreateRevenueReportCommand, RevenueReportDto>
{
    private readonly IApplicationDbContext _context;

    public CreateRevenueReportCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RevenueReportDto> Handle(
        CreateRevenueReportCommand request,
        CancellationToken cancellationToken)
    {
        var fromDate = request.FromDate.Date;
        var toDate = request.ToDate.Date;

        if (fromDate > toDate)
            throw new Exception("Ngày bắt đầu không được lớn hơn ngày kết thúc.");

        var toDateExclusive = toDate.AddDays(1);

        var existedReport = await _context.RevenueReports
            .AnyAsync(x =>
                x.FromDate == fromDate &&
                x.ToDate == toDate &&
                x.Status != "Cancelled",
                cancellationToken);

        if (existedReport)
            throw new Exception("Khoảng thời gian này đã có báo cáo doanh thu.");

        var invoices = await _context.Invoices
            .AsNoTracking()
            .Where(x =>
                x.IssuedAt >= fromDate &&
                x.IssuedAt < toDateExclusive &&
                (x.Status == "Issued" || x.Status == "Printed"))
            .ToListAsync(cancellationToken);

        if (!invoices.Any())
            throw new Exception("Không có hóa đơn hợp lệ trong khoảng thời gian này.");

        var totalInvoices = invoices.Count;
        var totalOrders = invoices.Select(x => x.OrderId).Distinct().Count();
        var totalAmount = invoices.Sum(x => x.TotalAmount);
        var totalDiscountAmount = invoices.Sum(x => x.DiscountAmount);
        var totalVatAmount = invoices.Sum(x => x.VatAmount);
        var totalRevenue = invoices.Sum(x => x.FinalAmount);
        var totalCustomerPaid = invoices.Sum(x => x.CustomerPaid);
        var totalChangeAmount = invoices.Sum(x => x.ChangeAmount);

        var report = new RevenueReport(
            fromDate,
            toDate,
            totalInvoices,
            totalOrders,
            totalAmount,
            totalDiscountAmount,
            totalVatAmount,
            totalRevenue,
            totalCustomerPaid,
            totalChangeAmount,
            request.Note);

        await _context.RevenueReports.AddAsync(report, cancellationToken);

        var invoiceIds = invoices.Select(x => x.Id).ToList();

        var invoiceItems = await _context.InvoiceItems
            .AsNoTracking()
            .Where(x => invoiceIds.Contains(x.InvoiceId))
            .ToListAsync(cancellationToken);

        var reportItems = invoiceItems
            .GroupBy(x => new
            {
                x.MenuItemId,
                x.MenuItemName
            })
            .Select(g => new RevenueReportItem(
                report.Id,
                g.Key.MenuItemId,
                g.Key.MenuItemName,
                g.Sum(x => x.Quantity),
                g.Sum(x => x.TotalPrice)))
            .ToList();

        await _context.RevenueReportItems.AddRangeAsync(reportItems, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new RevenueReportDto
        {
            Id = report.Id,
            ReportCode = report.ReportCode,
            FromDate = report.FromDate,
            ToDate = report.ToDate,
            TotalInvoices = report.TotalInvoices,
            TotalOrders = report.TotalOrders,
            TotalAmount = report.TotalAmount,
            TotalDiscountAmount = report.TotalDiscountAmount,
            TotalVatAmount = report.TotalVatAmount,
            TotalRevenue = report.TotalRevenue,
            TotalCustomerPaid = report.TotalCustomerPaid,
            TotalChangeAmount = report.TotalChangeAmount,
            AverageRevenuePerInvoice = report.AverageRevenuePerInvoice,
            Status = report.Status,
            Note = report.Note,
            GeneratedAt = report.GeneratedAt,
            CreatedAt = report.CreatedAt,
            UpdatedAt = report.UpdatedAt,
            Items = reportItems.Select(x => new RevenueReportItemDto
            {
                Id = x.Id,
                RevenueReportId = x.RevenueReportId,
                MenuItemId = x.MenuItemId,
                MenuItemName = x.MenuItemName,
                QuantitySold = x.QuantitySold,
                TotalRevenue = x.TotalRevenue,
                CreatedAt = x.CreatedAt
            }).ToList()
        };
    }
}