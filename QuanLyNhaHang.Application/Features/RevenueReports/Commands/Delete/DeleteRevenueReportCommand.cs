using MediatR;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Commands.Delete;

public class DeleteRevenueReportCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}