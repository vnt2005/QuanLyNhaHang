namespace QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

public class PermissionInRoleDto
{
    public Guid PermissionId { get; set; }

    public string PermissionCode { get; set; } = string.Empty;

    public string PermissionName { get; set; } = string.Empty;

    public string PermissionGroupName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; }
}