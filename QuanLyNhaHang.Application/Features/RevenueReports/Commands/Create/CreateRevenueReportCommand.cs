using MediatR;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Commands.Create;

public class CreateRevenueReportCommand : IRequest<RevenueReportDto>
{
    public DateTime FromDate { get; set; }

    public DateTime ToDate { get; set; }

    public string? Note { get; set; }
}