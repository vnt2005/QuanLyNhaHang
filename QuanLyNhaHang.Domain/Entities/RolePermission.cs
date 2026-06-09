namespace QuanLyNhaHang.Domain.Entities;

public class RolePermission
{
    public Guid Id { get; private set; }

    public Guid RoleId { get; private set; }

    public Guid PermissionId { get; private set; }

    public DateTime CreatedAt { get; private set; }

    protected RolePermission()
    {
    }

    public RolePermission(
        Guid roleId,
        Guid permissionId)
    {
        Id = Guid.NewGuid();

        SetRoleId(roleId);
        SetPermissionId(permissionId);

        CreatedAt = DateTime.UtcNow;
    }

    private void SetRoleId(Guid roleId)
    {
        if (roleId == Guid.Empty)
            throw new ArgumentException("Vai trò không hợp lệ.");

        RoleId = roleId;
    }

    private void SetPermissionId(Guid permissionId)
    {
        if (permissionId == Guid.Empty)
            throw new ArgumentException("Quyền không hợp lệ.");

        PermissionId = permissionId;
    }
}