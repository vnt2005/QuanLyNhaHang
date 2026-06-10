using MediatR;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Commands.Create;

public class CreateActivityLogCommand : IRequest<ActivityLogDto>
{
    public Guid? UserId { get; set; }

    public string? UserName { get; set; }

    public string Action { get; set; } = string.Empty;

    public string ModuleName { get; set; } = string.Empty;

    public string? EntityName { get; set; }

    public Guid? EntityId { get; set; }

    public string Description { get; set; } = string.Empty;

    public string? OldValues { get; set; }

    public string? NewValues { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public string Status { get; set; } = "Success";
}