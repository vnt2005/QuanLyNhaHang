namespace QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

public class RolePermissionSelectionDto
{
    public Guid RoleId { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public string RoleDisplayName { get; set; } = string.Empty;

    public List<PermissionSelectionDto> Permissions { get; set; } = new();
}