using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetWithPaginatedList;

public class GetRevenueReportsWithPaginatedListQueryHandler
    : IRequestHandler<GetRevenueReportsWithPaginatedListQuery, PaginatedList<RevenueReportDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRevenueReportsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<RevenueReportDto>> Handle(
        GetRevenueReportsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.RevenueReports
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.ReportCode.Contains(keyword) ||
                x.Status.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        if (request.FromDate.HasValue)
        {
            var fromDate = request.FromDate.Value.Date;
            query = query.Where(x => x.FromDate >= fromDate);
        }

        if (request.ToDate.HasValue)
        {
            var toDate = request.ToDate.Value.Date;
            query = query.Where(x => x.ToDate <= toDate);
        }

        var reportDtos = query
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
            });

        return await PaginatedList<RevenueReportDto>.CreateAsync(
            reportDtos,
            request.PageNumber,
            request.PageSize);
    }
}