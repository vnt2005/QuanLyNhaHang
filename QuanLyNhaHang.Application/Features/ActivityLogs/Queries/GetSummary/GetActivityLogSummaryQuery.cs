using MediatR;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetSummary;

public class GetActivityLogSummaryQuery : IRequest<ActivityLogSummaryDto>
{
    public Guid? UserId { get; set; }

    public string? ModuleName { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }
}