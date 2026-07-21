using QuanLyNhaHang.Application.Common.Constants;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class SystemRoleCatalogTests
{
    [Fact]
    public void All_ContainsEveryBuiltInRoleExactlyOnce()
    {
        var expected = new[]
        {
            SystemRoles.Admin,
            SystemRoles.Manager,
            SystemRoles.Cashier,
            SystemRoles.Kitchen,
            SystemRoles.Staff,
            SystemRoles.Customer
        };
        var actual = SystemRoleCatalog.All.Select(role => role.Name).ToArray();

        Assert.Equal(
            expected.OrderBy(x => x, StringComparer.Ordinal),
            actual.OrderBy(x => x, StringComparer.Ordinal));
        Assert.Equal(
            actual.Length,
            actual.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData(" admin ")]
    [InlineData("MANAGER")]
    [InlineData("cashier")]
    [InlineData("Kitchen")]
    [InlineData("STAFF")]
    [InlineData("customer")]
    public void IsSystemRole_RecognizesReservedNamesCaseInsensitively(string roleName)
    {
        Assert.True(SystemRoleCatalog.IsSystemRole(roleName));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Supervisor")]
    [InlineData("Custom.Admin")]
    public void IsSystemRole_RejectsNonSystemNames(string? roleName)
    {
        Assert.False(SystemRoleCatalog.IsSystemRole(roleName));
    }

    [Theory]
    [InlineData("Admin")]
    [InlineData(" admin ")]
    [InlineData("CUSTOMER")]
    [InlineData(" customer ")]
    public void MustRemainWithoutPermissions_RecognizesProtectedRoles(string roleName)
    {
        Assert.True(SystemRoleCatalog.MustRemainWithoutPermissions(roleName));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Manager")]
    [InlineData("Cashier")]
    [InlineData("Kitchen")]
    [InlineData("Staff")]
    [InlineData("Auditor")]
    public void MustRemainWithoutPermissions_AllowsConfigurableRoles(string? roleName)
    {
        Assert.False(SystemRoleCatalog.MustRemainWithoutPermissions(roleName));
    }

    [Theory]
    [InlineData(SystemRoles.Manager)]
    [InlineData(SystemRoles.Cashier)]
    [InlineData(SystemRoles.Kitchen)]
    [InlineData(SystemRoles.Staff)]
    public void EmployeeRoles_UseTheLeastPrivilegeDefaultMatrix(string roleName)
    {
        var definition = SystemRoleCatalog.All.Single(role =>
            role.Name.Equals(roleName, StringComparison.OrdinalIgnoreCase));
        var expected = DefaultRolePermissions.GetForRole(roleName);

        Assert.Equal(
            expected.OrderBy(x => x, StringComparer.Ordinal),
            definition.DefaultPermissionCodes.OrderBy(x => x, StringComparer.Ordinal));
    }

    [Theory]
    [InlineData(SystemRoles.Admin)]
    [InlineData(SystemRoles.Customer)]
    public void AdminAndCustomer_DoNotNeedDefaultRolePermissionRows(string roleName)
    {
        var definition = SystemRoleCatalog.All.Single(role =>
            role.Name.Equals(roleName, StringComparison.OrdinalIgnoreCase));

        Assert.Empty(definition.DefaultPermissionCodes);
    }

    [Fact]
    public void DefaultPermissionCodes_AreUniqueAndExistInPermissionCatalog()
    {
        var catalogCodes = PermissionCatalog.All
            .Select(permission => permission.Code)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var role in SystemRoleCatalog.All)
        {
            Assert.Equal(
                role.DefaultPermissionCodes.Count,
                role.DefaultPermissionCodes
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Count());
            Assert.All(
                role.DefaultPermissionCodes,
                permissionCode => Assert.Contains(permissionCode, catalogCodes));
        }
    }
}