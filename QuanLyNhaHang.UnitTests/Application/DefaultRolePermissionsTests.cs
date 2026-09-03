using QuanLyNhaHang.Application.Common.Constants;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class DefaultRolePermissionsTests
{
    [Theory]
    [InlineData(
        SystemRoles.Manager,
        "Kitchen.View|Kitchen.UpdateStatus|Payments.View|Payments.Create|" +
        "Invoices.View|Invoices.Manage|" +
        "Orders.View|Orders.Create|Orders.Update|Orders.Delete|" +
        "Inventory.View|Inventory.ManageCatalog|Inventory.Transact|" +
        "Inventory.Adjust|Reservations.View|Reservations.Create|" +
        "Reservations.Update|Reservations.Cancel|Menu.View|Menu.Manage|" +
        "Menu.UpdateAvailability|Tables.View|Tables.Manage|" +
        "Tables.UpdateStatus|TableOperations.View|TableOperations.Transfer|" +
        "TableOperations.Merge|TableOperations.Split|TableOperations.Update|" +
        "TableOperations.Cancel|Employees.View|Promotions.View|" +
        "Promotions.Manage|Promotions.Apply|PromotionUsages.View|" +
        "PromotionUsages.UpdatePayment|PromotionUsages.Cancel|" +
        "RestaurantSettings.View|RestaurantSettings.Manage|" +
        "ActivityLogs.View|Shifts.View|Shifts.Manage|EmployeeShifts.View|" +
        "EmployeeShifts.Manage|RevenueReports.View|" +
        "RevenueReports.Manage|Dashboard.View")]
    [InlineData(
        SystemRoles.Cashier,
        "Orders.View|Payments.View|Payments.Create|Invoices.View|" +
        "Reservations.View|Reservations.Create|Reservations.Update|" +
        "Reservations.Cancel|Menu.View|Tables.View|Tables.UpdateStatus|" +
        "TableOperations.View|Promotions.View|Promotions.Apply|" +
        "PromotionUsages.View|PromotionUsages.UpdatePayment|" +
        "PromotionUsages.Cancel|RestaurantSettings.View")]
    [InlineData(
        SystemRoles.Kitchen,
        "Kitchen.View|Kitchen.UpdateStatus|Menu.View|" +
        "Menu.UpdateAvailability")]
    [InlineData(
        SystemRoles.Staff,
        "Orders.View|Orders.Create|Orders.Update|Reservations.View|" +
        "Reservations.Create|Reservations.Update|Reservations.Cancel|" +
        "Menu.View|Tables.View|Tables.UpdateStatus|TableOperations.View|" +
        "TableOperations.Transfer|TableOperations.Merge|TableOperations.Split|" +
        "TableOperations.Update")]
    public void GetForRole_ReturnsLeastPrivilegeMatrix(
        string role,
        string expectedCodes)
    {
        var expected = expectedCodes.Split('|');
        var actual = DefaultRolePermissions.GetForRole(role);

        Assert.Equal(
            expected.OrderBy(x => x, StringComparer.Ordinal),
            actual.OrderBy(x => x, StringComparer.Ordinal));

        Assert.Equal(
            actual.Count,
            actual.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Customer")]
    [InlineData("Unknown")]
    public void GetForRole_UnsupportedRole_ReturnsNoPermissions(string? role)
    {
        Assert.Empty(DefaultRolePermissions.GetForRole(role));
    }

    [Fact]
    public void GetForRole_IsCaseInsensitiveAndTrimsInput()
    {
        var permissions = DefaultRolePermissions.GetForRole("  manager  ");

        Assert.Contains(PermissionCodes.EmployeesView, permissions);
        Assert.DoesNotContain(PermissionCodes.EmployeesManage, permissions);
        Assert.DoesNotContain(PermissionCodes.UsersView, permissions);
        Assert.DoesNotContain(PermissionCodes.UsersManage, permissions);
        Assert.DoesNotContain(PermissionCodes.RolesView, permissions);
        Assert.DoesNotContain(PermissionCodes.RolesManage, permissions);
        Assert.DoesNotContain(PermissionCodes.PermissionsView, permissions);
        Assert.DoesNotContain(PermissionCodes.PermissionsManage, permissions);
        Assert.DoesNotContain(PermissionCodes.RolePermissionsView, permissions);
        Assert.DoesNotContain(PermissionCodes.RolePermissionsManage, permissions);
        Assert.Contains(PermissionCodes.PromotionsView, permissions);
        Assert.Contains(PermissionCodes.PromotionsManage, permissions);
        Assert.Contains(PermissionCodes.PromotionsApply, permissions);
        Assert.Contains(PermissionCodes.PromotionUsagesView, permissions);
        Assert.Contains(PermissionCodes.PromotionUsagesUpdatePayment, permissions);
        Assert.Contains(PermissionCodes.PromotionUsagesCancel, permissions);
        Assert.Contains(PermissionCodes.RestaurantSettingsView, permissions);
        Assert.Contains(PermissionCodes.RestaurantSettingsManage, permissions);
        Assert.Contains(PermissionCodes.ActivityLogsView, permissions);
        Assert.DoesNotContain(PermissionCodes.ActivityLogsCreate, permissions);
        Assert.DoesNotContain(PermissionCodes.ActivityLogsDelete, permissions);
        Assert.Contains(PermissionCodes.TableOperationsView, permissions);
        Assert.Contains(PermissionCodes.TableOperationsTransfer, permissions);
        Assert.Contains(PermissionCodes.TableOperationsMerge, permissions);
        Assert.Contains(PermissionCodes.TableOperationsSplit, permissions);
        Assert.Contains(PermissionCodes.TableOperationsUpdate, permissions);
        Assert.Contains(PermissionCodes.TableOperationsCancel, permissions);
        Assert.Contains(PermissionCodes.ShiftsView, permissions);
        Assert.Contains(PermissionCodes.ShiftsManage, permissions);
        Assert.Contains(PermissionCodes.EmployeeShiftsView, permissions);
        Assert.Contains(PermissionCodes.EmployeeShiftsManage, permissions);
    }

    [Fact]
    public void PaymentRoles_CanCreateCounterPaymentButCannotMutateSettledPaymentByDefault()
    {
        var manager = DefaultRolePermissions.GetForRole(SystemRoles.Manager);
        var cashier = DefaultRolePermissions.GetForRole(SystemRoles.Cashier);
        var staff = DefaultRolePermissions.GetForRole(SystemRoles.Staff);

        Assert.Contains(PermissionCodes.PaymentsView, manager);
        Assert.Contains(PermissionCodes.PaymentsCreate, manager);
        Assert.DoesNotContain(PermissionCodes.PaymentsUpdate, manager);
        Assert.DoesNotContain(PermissionCodes.PaymentsCancel, manager);

        Assert.Contains(PermissionCodes.PaymentsView, cashier);
        Assert.Contains(PermissionCodes.PaymentsCreate, cashier);
        Assert.DoesNotContain(PermissionCodes.PaymentsUpdate, cashier);
        Assert.DoesNotContain(PermissionCodes.PaymentsCancel, cashier);

        Assert.DoesNotContain(PermissionCodes.PaymentsCreate, staff);
        Assert.DoesNotContain(PermissionCodes.PaymentsUpdate, staff);
        Assert.DoesNotContain(PermissionCodes.PaymentsCancel, staff);
    }

    [Fact]
    public void Cashier_CanOperatePromotionsButCannotManageCatalog()
    {
        var permissions = DefaultRolePermissions.GetForRole(SystemRoles.Cashier);

        Assert.Contains(PermissionCodes.PromotionsView, permissions);
        Assert.Contains(PermissionCodes.PromotionsApply, permissions);
        Assert.DoesNotContain(PermissionCodes.PromotionsManage, permissions);
        Assert.Contains(PermissionCodes.PromotionUsagesView, permissions);
        Assert.Contains(PermissionCodes.PromotionUsagesUpdatePayment, permissions);
        Assert.Contains(PermissionCodes.PromotionUsagesCancel, permissions);
    }

    [Fact]
    public void Cashier_CanViewRestaurantSettingsButCannotManageThem()
    {
        var permissions = DefaultRolePermissions.GetForRole(SystemRoles.Cashier);

        Assert.Contains(PermissionCodes.RestaurantSettingsView, permissions);
        Assert.DoesNotContain(PermissionCodes.RestaurantSettingsManage, permissions);
    }

    [Fact]
    public void Manager_CanViewActivityLogsButCannotCreateOrDeleteThem()
    {
        var permissions = DefaultRolePermissions.GetForRole(SystemRoles.Manager);

        Assert.Contains(PermissionCodes.ActivityLogsView, permissions);
        Assert.DoesNotContain(PermissionCodes.ActivityLogsCreate, permissions);
        Assert.DoesNotContain(PermissionCodes.ActivityLogsDelete, permissions);
    }

    [Fact]
    public void TableOperationRoles_FollowLeastPrivilege()
    {
        var manager = DefaultRolePermissions.GetForRole(SystemRoles.Manager);
        var cashier = DefaultRolePermissions.GetForRole(SystemRoles.Cashier);
        var staff = DefaultRolePermissions.GetForRole(SystemRoles.Staff);
        var kitchen = DefaultRolePermissions.GetForRole(SystemRoles.Kitchen);

        Assert.Contains(PermissionCodes.TableOperationsCancel, manager);

        Assert.Contains(PermissionCodes.TableOperationsView, cashier);
        Assert.DoesNotContain(PermissionCodes.TableOperationsTransfer, cashier);
        Assert.DoesNotContain(PermissionCodes.TableOperationsCancel, cashier);

        Assert.Contains(PermissionCodes.TableOperationsTransfer, staff);
        Assert.Contains(PermissionCodes.TableOperationsMerge, staff);
        Assert.Contains(PermissionCodes.TableOperationsSplit, staff);
        Assert.Contains(PermissionCodes.TableOperationsUpdate, staff);
        Assert.DoesNotContain(PermissionCodes.TableOperationsCancel, staff);

        Assert.DoesNotContain(PermissionCodes.TableOperationsView, kitchen);
    }
}
