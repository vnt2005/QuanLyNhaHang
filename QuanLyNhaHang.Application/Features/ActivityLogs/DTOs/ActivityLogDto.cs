namespace QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

public class ActivityLogDto
{
    public Guid Id { get; set; }

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

    public string Status { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}