using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetList;

public class GetRevenueReportsQueryHandler
    : IRequestHandler<GetRevenueReportsQuery, List<RevenueReportDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRevenueReportsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RevenueReportDto>> Handle(
        GetRevenueReportsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.RevenueReports
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        return await query
            .OrderByDescending(x => x.GeneratedAt)
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
            .ToListAsync(cancellationToken);
    }
}