using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Time;
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
        var fromDate = request.FromDate?.Date ?? RestaurantTime.LocalToday;
        var toDate = request.ToDate?.Date ?? RestaurantTime.LocalToday;

        if (fromDate > toDate)
            (fromDate, toDate) = (toDate, fromDate);

        var utcRange = RestaurantTime.GetUtcRange(fromDate, toDate);

        var payments = await _context.Payments
            .AsNoTracking()
            .Where(payment =>
                payment.Status == "Paid" &&
                payment.PaidAt >= utcRange.StartUtc &&
                payment.PaidAt < utcRange.EndUtc)
            .ToListAsync(cancellationToken);

        var paymentIds = payments.Select(payment => payment.Id).ToList();
        var totalInvoices = paymentIds.Count == 0
            ? 0
            : await _context.Invoices
                .AsNoTracking()
                .CountAsync(
                    invoice =>
                        paymentIds.Contains(invoice.PaymentId) &&
                        invoice.Status != "Cancelled",
                    cancellationToken);

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

        var summaryItems = orderItems
            .GroupBy(item => new
            {
                item.MenuItemId,
                item.MenuItemName,
                item.UnitPrice
            })
            .Select(group => new RevenueReportSummaryItemDto
            {
                MenuItemId = group.Key.MenuItemId,
                MenuItemName = group.Key.MenuItemName,
                UnitPrice = group.Key.UnitPrice,
                Quantity = group.Sum(item => item.Quantity),
                TotalRevenue = group.Sum(item => item.TotalPrice)
            })
            .OrderByDescending(item => item.TotalRevenue)
            .ToList();

        var paymentMethods = payments
            .GroupBy(payment => payment.PaymentMethod)
            .Select(group => new RevenuePaymentMethodSummaryDto
            {
                PaymentMethod = group.Key,
                PaymentCount = group.Count(),
                TotalAmount = group.Sum(payment => payment.FinalAmount)
            })
            .OrderByDescending(item => item.TotalAmount)
            .ToList();

        var totalRevenue = payments.Sum(payment => payment.FinalAmount);

        return new RevenueReportSummaryDto
        {
            FromDate = fromDate,
            ToDate = toDate,
            TotalInvoices = totalInvoices,
            TotalOrders = orderIds.Count,
            TotalAmount = payments.Sum(payment => payment.TotalAmount),
            TotalDiscountAmount = payments.Sum(payment => payment.DiscountAmount),
            TotalVatAmount = payments.Sum(payment => payment.VatAmount),
            TotalRevenue = totalRevenue,
            TotalCustomerPaid = payments.Sum(payment => payment.CustomerPaid),
            TotalChangeAmount = payments.Sum(payment => payment.ChangeAmount),
            AverageRevenuePerInvoice = totalInvoices == 0
                ? 0
                : totalRevenue / totalInvoices,
            PaymentMethods = paymentMethods,
            Items = summaryItems
        };
    }
}
