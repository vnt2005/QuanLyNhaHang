using MediatR;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetById;

public class GetRevenueReportByIdQuery : IRequest<RevenueReportDto?>
{
    public Guid Id { get; set; }
}