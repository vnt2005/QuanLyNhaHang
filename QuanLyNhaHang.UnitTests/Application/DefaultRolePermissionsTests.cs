using QuanLyNhaHang.Application.Common.Constants;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class DefaultRolePermissionsTests
{
    [Theory]
    [InlineData(
        SystemRoles.Manager,
        "Kitchen.View|Kitchen.UpdateStatus|Payments.View|Payments.Create|" +
        "Payments.Update|Payments.Cancel|Orders.View|Orders.Create|" +
        "Orders.Update|Orders.Delete|Inventory.View|" +
        "Inventory.ManageCatalog|Inventory.Transact|Inventory.Adjust|" +
        "Reservations.View|Reservations.Create|Reservations.Update|" +
        "Reservations.Cancel|Menu.View|Menu.Manage|" +
        "Menu.UpdateAvailability|Tables.View|Tables.Manage|" +
        "Tables.UpdateStatus")]
    [InlineData(
        SystemRoles.Cashier,
        "Orders.View|Payments.View|Payments.Create|Payments.Update|" +
        "Payments.Cancel|Reservations.View|Reservations.Create|" +
        "Reservations.Update|Reservations.Cancel|Menu.View|" +
        "Tables.View|Tables.UpdateStatus")]
    [InlineData(
        SystemRoles.Kitchen,
        "Kitchen.View|Kitchen.UpdateStatus|Menu.View|" +
        "Menu.UpdateAvailability")]
    [InlineData(
        SystemRoles.Staff,
        "Orders.View|Orders.Create|Orders.Update|Reservations.View|" +
        "Reservations.Create|Reservations.Update|Reservations.Cancel|" +
        "Menu.View|Tables.View|Tables.UpdateStatus")]
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
        var permissions = DefaultRolePermissions.GetForRole("  cashier  ");

        Assert.Contains(PermissionCodes.PaymentsCreate, permissions);
        Assert.Contains(PermissionCodes.ReservationsCreate, permissions);
        Assert.Contains(PermissionCodes.TablesView, permissions);
    }
}
