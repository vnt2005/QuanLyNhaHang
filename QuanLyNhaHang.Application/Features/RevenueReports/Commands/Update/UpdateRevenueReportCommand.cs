using MediatR;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Commands.Update;

public class UpdateRevenueReportCommand : IRequest<RevenueReportDto>
{
    public Guid Id { get; set; }

    public string? Status { get; set; }

    public string? Note { get; set; }
}