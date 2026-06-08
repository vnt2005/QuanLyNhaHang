using MediatR;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetList;

public class GetRevenueReportsQuery : IRequest<List<RevenueReportDto>>
{
    public string? Status { get; set; }
}