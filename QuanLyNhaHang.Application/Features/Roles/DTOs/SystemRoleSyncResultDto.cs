namespace QuanLyNhaHang.Application.Features.Roles.DTOs;

public sealed class SystemRoleSyncResultDto
{
    public int CatalogCount { get; set; }

    public int CreatedRoleCount { get; set; }

    public int ExistingRoleCount { get; set; }

    public int AddedRolePermissionCount { get; set; }

    public int SkippedPermissionCount { get; set; }

    public IReadOnlyCollection<string> CreatedRoleNames { get; set; } =
        Array.Empty<string>();
}
