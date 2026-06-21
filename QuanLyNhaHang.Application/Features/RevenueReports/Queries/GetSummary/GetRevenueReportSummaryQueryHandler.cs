using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetSummary;

public class GetRevenueReportSummaryQueryHandler
    : IRequestHandler<GetRevenueReportSummaryQuery, RevenueReportSummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetRevenueReportSummaryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RevenueReportSummaryDto> Handle(
        GetRevenueReportSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var fromDate = request.FromDate?.Date ?? DateTime.Today;

        var toDate = request.ToDate?.Date.AddDays(1).AddTicks(-1)
                     ?? DateTime.Today.AddDays(1).AddTicks(-1);

        var invoices = await _context.Invoices
            .Where(x =>
                x.Status != "Cancelled" &&
                x.IssuedAt >= fromDate &&
                x.IssuedAt <= toDate)
            .ToListAsync(cancellationToken);

        var invoiceIds = invoices
            .Select(x => x.Id)
            .ToList();

        var invoiceItems = await _context.InvoiceItems
            .Where(x => invoiceIds.Contains(x.InvoiceId))
            .ToListAsync(cancellationToken);

        var summaryItems = invoiceItems
            .GroupBy(x => new
            {
                x.MenuItemId,
                x.MenuItemName,
                x.UnitPrice
            })
            .Select(g => new RevenueReportSummaryItemDto
            {
                MenuItemId = g.Key.MenuItemId,
                MenuItemName = g.Key.MenuItemName,
                UnitPrice = g.Key.UnitPrice,
                Quantity = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.TotalPrice)
            })
            .OrderByDescending(x => x.TotalRevenue)
            .ToList();

        var totalInvoices = invoices.Count;
        var totalRevenue = invoices.Sum(x => x.FinalAmount);

        return new RevenueReportSummaryDto
        {
            FromDate = fromDate,
            ToDate = toDate,

            TotalInvoices = totalInvoices,

            TotalOrders = invoices
                .Select(x => x.OrderId)
                .Distinct()
                .Count(),

            TotalAmount = invoices.Sum(x => x.TotalAmount),
            TotalDiscountAmount = invoices.Sum(x => x.DiscountAmount),
            TotalVatAmount = invoices.Sum(x => x.VatAmount),
            TotalRevenue = totalRevenue,
            TotalCustomerPaid = invoices.Sum(x => x.CustomerPaid),
            TotalChangeAmount = invoices.Sum(x => x.ChangeAmount),

            AverageRevenuePerInvoice = totalInvoices == 0
                ? 0
                : totalRevenue / totalInvoices,

            Items = summaryItems
        };
    }
}