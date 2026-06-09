namespace QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

public class RoleWithPermissionsDto
{
    public Guid RoleId { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public string RoleDisplayName { get; set; } = string.Empty;

    public string? RoleDescription { get; set; }

    public bool IsActive { get; set; }

    public List<PermissionInRoleDto> Permissions { get; set; } = new();
}