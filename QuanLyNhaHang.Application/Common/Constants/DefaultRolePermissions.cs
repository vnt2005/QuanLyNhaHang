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
            PermissionCodes.InvoicesView,
            PermissionCodes.InvoicesManage,
            PermissionCodes.OrdersView,
            PermissionCodes.OrdersCreate,
            PermissionCodes.OrdersUpdate,
            PermissionCodes.OrdersDelete,
            PermissionCodes.InventoryView,
            PermissionCodes.InventoryManageCatalog,
            PermissionCodes.InventoryTransact,
            PermissionCodes.InventoryAdjust,
            PermissionCodes.ReservationsView,
            PermissionCodes.ReservationsCreate,
            PermissionCodes.ReservationsUpdate,
            PermissionCodes.ReservationsCancel,
            PermissionCodes.MenuView,
            PermissionCodes.MenuManage,
            PermissionCodes.MenuUpdateAvailability,
            PermissionCodes.TablesView,
            PermissionCodes.TablesManage,
            PermissionCodes.TablesUpdateStatus,
            PermissionCodes.EmployeesView,
            PermissionCodes.PromotionsView,
            PermissionCodes.PromotionsManage,
            PermissionCodes.PromotionsApply,
            PermissionCodes.PromotionUsagesView,
            PermissionCodes.PromotionUsagesUpdatePayment,
            PermissionCodes.PromotionUsagesCancel,
            PermissionCodes.RestaurantSettingsView,
            PermissionCodes.RestaurantSettingsManage,
            PermissionCodes.ShiftsView,
            PermissionCodes.ShiftsManage,
            PermissionCodes.EmployeeShiftsView,
            PermissionCodes.EmployeeShiftsManage,
            PermissionCodes.RevenueReportsView,
            PermissionCodes.RevenueReportsManage,
            PermissionCodes.DashboardView
        });

    private static readonly IReadOnlyCollection<string> Cashier =
        Array.AsReadOnly(new[]
        {
            PermissionCodes.OrdersView,
            PermissionCodes.PaymentsView,
            PermissionCodes.PaymentsCreate,
            PermissionCodes.PaymentsUpdate,
            PermissionCodes.PaymentsCancel,
            PermissionCodes.InvoicesView,
            PermissionCodes.ReservationsView,
            PermissionCodes.ReservationsCreate,
            PermissionCodes.ReservationsUpdate,
            PermissionCodes.ReservationsCancel,
            PermissionCodes.MenuView,
            PermissionCodes.TablesView,
            PermissionCodes.TablesUpdateStatus,
            PermissionCodes.PromotionsView,
            PermissionCodes.PromotionsApply,
            PermissionCodes.PromotionUsagesView,
            PermissionCodes.PromotionUsagesUpdatePayment,
            PermissionCodes.PromotionUsagesCancel,
            PermissionCodes.RestaurantSettingsView
        });

    private static readonly IReadOnlyCollection<string> Kitchen =
        Array.AsReadOnly(new[]
        {
            PermissionCodes.KitchenView,
            PermissionCodes.KitchenUpdateStatus,
            PermissionCodes.MenuView,
            PermissionCodes.MenuUpdateAvailability
        });

    private static readonly IReadOnlyCollection<string> Staff =
        Array.AsReadOnly(new[]
        {
            PermissionCodes.OrdersView,
            PermissionCodes.OrdersCreate,
            PermissionCodes.OrdersUpdate,
            PermissionCodes.ReservationsView,
            PermissionCodes.ReservationsCreate,
            PermissionCodes.ReservationsUpdate,
            PermissionCodes.ReservationsCancel,
            PermissionCodes.MenuView,
            PermissionCodes.TablesView,
            PermissionCodes.TablesUpdateStatus
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
