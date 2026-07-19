using QuanLyNhaHang.Domain.Entities;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Domain;

public sealed class InventoryTests
{
    [Fact]
    public void Ingredient_TracksImportExportAndAdjustment()
    {
        var ingredient = CreateIngredient(
            currentStock: 10m,
            minimumStock: 5m);

        ingredient.ImportStock(4m);
        Assert.Equal(14m, ingredient.CurrentStock);

        ingredient.ExportStock(3m);
        Assert.Equal(11m, ingredient.CurrentStock);

        ingredient.AdjustStock(5m);
        Assert.Equal(5m, ingredient.CurrentStock);
        Assert.True(ingredient.IsLowStock());
        Assert.NotNull(ingredient.UpdatedAt);
    }

    [Fact]
    public void Ingredient_NormalizesCodeNameUnitAndNote()
    {
        var ingredient = new Ingredient(
            Guid.NewGuid(),
            "  nl-001  ",
            "  Thịt bò  ",
            "  kg  ",
            10m,
            2m,
            180_000m,
            "  Bảo quản lạnh  ");

        Assert.Equal("NL-001", ingredient.IngredientCode);
        Assert.Equal("Thịt bò", ingredient.Name);
        Assert.Equal("kg", ingredient.Unit);
        Assert.Equal("Bảo quản lạnh", ingredient.Note);
        Assert.True(ingredient.IsActive);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Ingredient_RejectsNonPositiveStockMovements(decimal quantity)
    {
        var ingredient = CreateIngredient();

        Assert.Throws<ArgumentException>(() =>
            ingredient.ImportStock(quantity));
        Assert.Throws<ArgumentException>(() =>
            ingredient.ExportStock(quantity));
    }

    [Fact]
    public void Ingredient_RejectsExportAboveCurrentStock()
    {
        var ingredient = CreateIngredient(currentStock: 3m);

        Assert.Throws<InvalidOperationException>(() =>
            ingredient.ExportStock(3.1m));

        Assert.Equal(3m, ingredient.CurrentStock);
    }

    [Fact]
    public void Ingredient_RejectsNegativeStockAndPrices()
    {
        Assert.Throws<ArgumentException>(() =>
            CreateIngredient(currentStock: -1m));
        Assert.Throws<ArgumentException>(() =>
            CreateIngredient(minimumStock: -1m));
        Assert.Throws<ArgumentException>(() =>
            CreateIngredient(costPrice: -1m));

        var ingredient = CreateIngredient();
        Assert.Throws<ArgumentException>(() =>
            ingredient.AdjustStock(-1m));
    }

    [Fact]
    public void InventoryTransaction_CalculatesTotalAndCanBeCancelled()
    {
        var transaction = new InventoryTransaction(
            Guid.NewGuid(),
            "Import",
            3.5m,
            20_000m,
            10m,
            13.5m,
            "  Nhập hàng đầu ngày  ");

        Assert.NotEqual(Guid.Empty, transaction.Id);
        Assert.StartsWith("INV-", transaction.TransactionCode);
        Assert.Equal(70_000m, transaction.TotalAmount);
        Assert.Equal("Completed", transaction.Status);
        Assert.Equal("Nhập hàng đầu ngày", transaction.Note);

        transaction.Cancel();

        Assert.Equal("Cancelled", transaction.Status);
        Assert.NotNull(transaction.CancelledAt);
        Assert.Throws<InvalidOperationException>(() =>
            transaction.Cancel());
    }

    [Theory]
    [InlineData("")]
    [InlineData("Purchase")]
    [InlineData("import")]
    public void InventoryTransaction_RejectsInvalidType(string type)
    {
        Assert.Throws<ArgumentException>(() =>
            new InventoryTransaction(
                Guid.NewGuid(),
                type,
                1m,
                10_000m,
                1m,
                2m,
                null));
    }

    [Fact]
    public void InventoryTransaction_RejectsInvalidAmounts()
    {
        Assert.Throws<ArgumentException>(() => CreateTransaction(
            quantity: 0m));
        Assert.Throws<ArgumentException>(() => CreateTransaction(
            unitPrice: -1m));
        Assert.Throws<ArgumentException>(() => CreateTransaction(
            stockBefore: -1m));
        Assert.Throws<ArgumentException>(() => CreateTransaction(
            stockAfter: -1m));
    }

    private static Ingredient CreateIngredient(
        decimal currentStock = 10m,
        decimal minimumStock = 2m,
        decimal costPrice = 50_000m)
    {
        return new Ingredient(
            Guid.NewGuid(),
            "NL-TEST",
            "Nguyên liệu thử nghiệm",
            "kg",
            currentStock,
            minimumStock,
            costPrice,
            null);
    }

    private static InventoryTransaction CreateTransaction(
        decimal quantity = 1m,
        decimal unitPrice = 10_000m,
        decimal stockBefore = 1m,
        decimal stockAfter = 2m)
    {
        return new InventoryTransaction(
            Guid.NewGuid(),
            "Import",
            quantity,
            unitPrice,
            stockBefore,
            stockAfter,
            null);
    }
}
