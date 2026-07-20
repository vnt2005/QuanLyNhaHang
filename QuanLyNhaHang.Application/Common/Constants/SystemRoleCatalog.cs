namespace QuanLyNhaHang.Application.Common.Constants;

public sealed record SystemRoleDefinition(
    string Name,
    string DisplayName,
    string Description,
    IReadOnlyCollection<string> DefaultPermissionCodes);

public static class SystemRoleCatalog
{
    public static IReadOnlyCollection<SystemRoleDefinition> All { get; } =
        Array.AsReadOnly(new[]
        {
            new SystemRoleDefinition(
                SystemRoles.Admin,
                "Quản trị viên",
                "Vai trò quản trị hệ thống. Admin được bypass kiểm tra permission để tránh tự khóa hệ thống.",
                Array.Empty<string>()),
            new SystemRoleDefinition(
                SystemRoles.Manager,
                "Quản lý",
                "Quản lý vận hành nhà hàng và các báo cáo nghiệp vụ.",
                DefaultRolePermissions.GetForRole(SystemRoles.Manager)),
            new SystemRoleDefinition(
                SystemRoles.Cashier,
                "Thu ngân",
                "Thực hiện thanh toán, hóa đơn và các nghiệp vụ thu ngân.",
                DefaultRolePermissions.GetForRole(SystemRoles.Cashier)),
            new SystemRoleDefinition(
                SystemRoles.Kitchen,
                "Bếp",
                "Tiếp nhận và cập nhật trạng thái chế biến món ăn.",
                DefaultRolePermissions.GetForRole(SystemRoles.Kitchen)),
            new SystemRoleDefinition(
                SystemRoles.Staff,
                "Nhân viên phục vụ",
                "Thực hiện nghiệp vụ phục vụ, order, đặt bàn và thao tác bàn.",
                DefaultRolePermissions.GetForRole(SystemRoles.Staff)),
            new SystemRoleDefinition(
                SystemRoles.Customer,
                "Khách hàng",
                "Tài khoản khách hàng, không có quyền truy cập API quản trị mặc định.",
                Array.Empty<string>())
        });

    public static bool IsSystemRole(string? roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName))
            return false;

        var normalizedRoleName = roleName.Trim();

        return All.Any(role => role.Name.Equals(
            normalizedRoleName,
            StringComparison.OrdinalIgnoreCase));
    }
}
