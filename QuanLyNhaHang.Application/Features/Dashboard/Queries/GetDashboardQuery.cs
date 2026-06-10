using MediatR;
using QuanLyNhaHang.Application.Features.Dashboard.DTOs;

namespace QuanLyNhaHang.Application.Features.Dashboard.Queries.GetDashboard;

public class GetDashboardQuery : IRequest<DashboardDto>
{
    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int Top { get; set; } = 5;
}