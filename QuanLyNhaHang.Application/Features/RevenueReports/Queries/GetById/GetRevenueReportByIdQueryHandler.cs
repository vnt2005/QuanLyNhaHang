using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetById;

public class GetRevenueReportByIdQueryHandler
    : IRequestHandler<GetRevenueReportByIdQuery, RevenueReportDto?>
{
    private readonly IApplicationDbContext _context;

    public GetRevenueReportByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RevenueReportDto?> Handle(
        GetRevenueReportByIdQuery request,
        CancellationToken cancellationToken)
    {
        var report = await _context.RevenueReports
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new RevenueReportDto
            {
                Id = x.Id,
                ReportCode = x.ReportCode,
                FromDate = x.FromDate,
                ToDate = x.ToDate,
                TotalInvoices = x.TotalInvoices,
                TotalOrders = x.TotalOrders,
                TotalAmount = x.TotalAmount,
                TotalDiscountAmount = x.TotalDiscountAmount,
                TotalVatAmount = x.TotalVatAmount,
                TotalRevenue = x.TotalRevenue,
                TotalCustomerPaid = x.TotalCustomerPaid,
                TotalChangeAmount = x.TotalChangeAmount,
                AverageRevenuePerInvoice = x.AverageRevenuePerInvoice,
                Status = x.Status,
                Note = x.Note,
                GeneratedAt = x.GeneratedAt,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (report == null)
            return null;

        report.Items = await _context.RevenueReportItems
            .AsNoTracking()
            .Where(x => x.RevenueReportId == report.Id)
            .OrderByDescending(x => x.QuantitySold)
            .Select(x => new RevenueReportItemDto
            {
                Id = x.Id,
                RevenueReportId = x.RevenueReportId,
                MenuItemId = x.MenuItemId,
                MenuItemName = x.MenuItemName,
                QuantitySold = x.QuantitySold,
                TotalRevenue = x.TotalRevenue,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return report;
    }
}