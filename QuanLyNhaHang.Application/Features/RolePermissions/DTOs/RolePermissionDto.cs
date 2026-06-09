namespace QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

public class RolePermissionDto
{
    public Guid Id { get; set; }

    public Guid RoleId { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public string RoleDisplayName { get; set; } = string.Empty;

    public Guid PermissionId { get; set; }

    public string PermissionCode { get; set; } = string.Empty;

    public string PermissionName { get; set; } = string.Empty;

    public string PermissionGroupName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
}