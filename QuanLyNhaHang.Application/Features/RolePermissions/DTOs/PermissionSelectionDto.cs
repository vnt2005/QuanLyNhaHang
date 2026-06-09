namespace QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

public class PermissionSelectionDto
{
    public Guid PermissionId { get; set; }

    public string PermissionCode { get; set; } = string.Empty;

    public string PermissionName { get; set; } = string.Empty;

    public string PermissionGroupName { get; set; } = string.Empty;

    public bool IsSelected { get; set; }
}