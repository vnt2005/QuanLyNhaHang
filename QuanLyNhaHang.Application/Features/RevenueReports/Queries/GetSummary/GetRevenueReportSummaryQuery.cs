using MediatR;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetSummary;

public class GetRevenueReportSummaryQuery : IRequest<RevenueReportSummaryDto>
{
    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }
}