namespace QuanLyNhaHang.Application.Common.Constants;

public static class DefaultRolePermissions
{
    private static readonly IReadOnlyCollection<string> Manager =
        Array.AsReadOnly(new[]
        {
            PermissionCodes.KitchenView,
            PermissionCodes.KitchenUpdateStatus,
            PermissionCodes.PaymentsView,
            PermissionCodes.PaymentsCreate,
            PermissionCodes.PaymentsUpdate,
            PermissionCodes.PaymentsCancel,
            PermissionCodes.OrdersView,
            PermissionCodes.OrdersCreate,
            PermissionCodes.OrdersUpdate,
            PermissionCodes.OrdersDelete
        });

    private static readonly IReadOnlyCollection<string> Cashier =
        Array.AsReadOnly(new[]
        {
            PermissionCodes.OrdersView,
            PermissionCodes.PaymentsView,
            PermissionCodes.PaymentsCreate,
            PermissionCodes.PaymentsUpdate,
            PermissionCodes.PaymentsCancel
        });

    private static readonly IReadOnlyCollection<string> Kitchen =
        Array.AsReadOnly(new[]
        {
            PermissionCodes.KitchenView,
            PermissionCodes.KitchenUpdateStatus
        });

    private static readonly IReadOnlyCollection<string> Staff =
        Array.AsReadOnly(new[]
        {
            PermissionCodes.OrdersView,
            PermissionCodes.OrdersCreate,
            PermissionCodes.OrdersUpdate
        });

    public static IReadOnlyCollection<string> GetForRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
            return Array.Empty<string>();

        var normalizedRole = role.Trim();

        if (normalizedRole.Equals(
                SystemRoles.Manager,
                StringComparison.OrdinalIgnoreCase))
        {
            return Manager;
        }

        if (normalizedRole.Equals(
                SystemRoles.Cashier,
                StringComparison.OrdinalIgnoreCase))
        {
            return Cashier;
        }

        if (normalizedRole.Equals(
                SystemRoles.Kitchen,
                StringComparison.OrdinalIgnoreCase))
        {
            return Kitchen;
        }

        if (normalizedRole.Equals(
                SystemRoles.Staff,
                StringComparison.OrdinalIgnoreCase))
        {
            return Staff;
        }

        return Array.Empty<string>();
    }
}
