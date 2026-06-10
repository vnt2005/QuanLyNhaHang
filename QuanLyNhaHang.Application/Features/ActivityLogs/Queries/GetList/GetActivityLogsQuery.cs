using MediatR;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetList;

public class GetActivityLogsQuery : IRequest<List<ActivityLogDto>>
{
    public Guid? UserId { get; set; }

    public string? Action { get; set; }

    public string? ModuleName { get; set; }

    public string? EntityName { get; set; }

    public Guid? EntityId { get; set; }

    public string? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }
}