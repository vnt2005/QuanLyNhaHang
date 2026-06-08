using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetWithPaginatedList;

public class GetRevenueReportsWithPaginatedListQuery : IRequest<PaginatedList<RevenueReportDto>>
{
    public string? Keyword { get; set; }

    public string? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}