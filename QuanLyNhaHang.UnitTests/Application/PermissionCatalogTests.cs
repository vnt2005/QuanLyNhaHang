using System.Reflection;
using QuanLyNhaHang.Application.Common.Constants;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class PermissionCatalogTests
{
    [Fact]
    public void Catalog_ContainsEveryPermissionCodeExactlyOnce()
    {
        var expectedCodes = typeof(PermissionCodes)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field =>
                field.IsLiteral &&
                !field.IsInitOnly &&
                field.FieldType == typeof(string))
            .Select(field => (string)field.GetRawConstantValue()!)
            .OrderBy(code => code, StringComparer.Ordinal)
            .ToArray();
        var actualCodes = PermissionCatalog.All
            .Select(definition => definition.Code)
            .OrderBy(code => code, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(expectedCodes, actualCodes);
        Assert.Equal(
            actualCodes.Length,
            actualCodes.Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }

    [Fact]
    public void Catalog_DefinitionsHaveValidMetadata()
    {
        Assert.All(PermissionCatalog.All, definition =>
        {
            Assert.False(string.IsNullOrWhiteSpace(definition.Code));
            Assert.False(string.IsNullOrWhiteSpace(definition.Name));
            Assert.False(string.IsNullOrWhiteSpace(definition.GroupName));
            Assert.False(string.IsNullOrWhiteSpace(definition.Description));
            Assert.StartsWith(
                $"{definition.GroupName}.",
                definition.Code,
                StringComparison.Ordinal);
        });
    }

    [Fact]
    public void Catalog_UsesFriendlyMetadataForTableOperations()
    {
        var definition = PermissionCatalog.All.Single(item =>
            item.Code == PermissionCodes.TableOperationsTransfer);

        Assert.Equal("Chuyển bàn Thao tác bàn", definition.Name);
        Assert.Equal("TableOperations", definition.GroupName);
    }
}
