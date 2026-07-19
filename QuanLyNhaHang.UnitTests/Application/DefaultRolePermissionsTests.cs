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
        "Orders.Update|Orders.Delete")]
    [InlineData(
        SystemRoles.Cashier,
        "Orders.View|Payments.View|Payments.Create|Payments.Update|" +
        "Payments.Cancel")]
    [InlineData(
        SystemRoles.Kitchen,
        "Kitchen.View|Kitchen.UpdateStatus")]
    [InlineData(
        SystemRoles.Staff,
        "Orders.View|Orders.Create|Orders.Update")]
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
        Assert.Contains(PermissionCodes.OrdersView, permissions);
    }
}
