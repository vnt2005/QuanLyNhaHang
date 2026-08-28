using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Time;
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

        var utcRange = RestaurantTime.GetUtcRange(fromDate, toDate);

        var existedReport = await _context.RevenueReports
            .AnyAsync(report =>
                report.FromDate == fromDate &&
                report.ToDate == toDate &&
                report.Status != "Cancelled",
                cancellationToken);

        if (existedReport)
            throw new Exception("Khoảng thời gian này đã có báo cáo doanh thu.");

        var payments = await _context.Payments
            .AsNoTracking()
            .Where(payment =>
                payment.Status == "Paid" &&
                payment.PaidAt >= utcRange.StartUtc &&
                payment.PaidAt < utcRange.EndUtc)
            .ToListAsync(cancellationToken);

        if (payments.Count == 0)
            throw new Exception(
                "Không có giao dịch đã thanh toán trong khoảng thời gian này.");

        var paymentIds = payments.Select(payment => payment.Id).ToList();
        var totalInvoices = await _context.Invoices
            .AsNoTracking()
            .CountAsync(
                invoice =>
                    paymentIds.Contains(invoice.PaymentId) &&
                    invoice.Status != "Cancelled",
                cancellationToken);

        var totalOrders = payments
            .Select(payment => payment.OrderId)
            .Distinct()
            .Count();
        var totalAmount = payments.Sum(payment => payment.TotalAmount);
        var totalDiscountAmount = payments.Sum(payment => payment.DiscountAmount);
        var totalVatAmount = payments.Sum(payment => payment.VatAmount);
        var totalRevenue = payments.Sum(payment => payment.FinalAmount);
        var totalCustomerPaid = payments.Sum(payment => payment.CustomerPaid);
        var totalChangeAmount = payments.Sum(payment => payment.ChangeAmount);

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

        var orderIds = payments
            .Select(payment => payment.OrderId)
            .Distinct()
            .ToList();

        var orderItems = await _context.OrderItems
            .AsNoTracking()
            .Where(item =>
                orderIds.Contains(item.OrderId) &&
                item.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        var reportItems = orderItems
            .GroupBy(item => new
            {
                item.MenuItemId,
                item.MenuItemName
            })
            .Select(group => new RevenueReportItem(
                report.Id,
                group.Key.MenuItemId,
                group.Key.MenuItemName,
                group.Sum(item => item.Quantity),
                group.Sum(item => item.TotalPrice)))
            .ToList();

        await _context.RevenueReportItems.AddRangeAsync(
            reportItems,
            cancellationToken);

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
            Items = reportItems.Select(item => new RevenueReportItemDto
            {
                Id = item.Id,
                RevenueReportId = item.RevenueReportId,
                MenuItemId = item.MenuItemId,
                MenuItemName = item.MenuItemName,
                QuantitySold = item.QuantitySold,
                TotalRevenue = item.TotalRevenue,
                CreatedAt = item.CreatedAt
            }).ToList()
        };
    }
}
