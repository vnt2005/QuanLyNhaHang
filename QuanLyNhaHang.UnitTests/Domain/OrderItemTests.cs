using QuanLyNhaHang.Domain.Entities;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Domain;

public sealed class OrderItemTests
{
    [Fact]
    public void Constructor_NormalizesInputAndCalculatesTotal()
    {
        var beforeCreation = DateTime.UtcNow;

        var item = new OrderItem(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "  Cơm gà  ",
            3,
            45_000m,
            "  Ít cay  ");

        Assert.NotEqual(Guid.Empty, item.Id);
        Assert.Equal("Cơm gà", item.MenuItemName);
        Assert.Equal(3, item.Quantity);
        Assert.Equal(45_000m, item.UnitPrice);
        Assert.Equal(135_000m, item.TotalPrice);
        Assert.Equal("Pending", item.Status);
        Assert.Equal("Ít cay", item.Note);
        Assert.InRange(item.CreatedAt, beforeCreation, DateTime.UtcNow);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_RejectsNonPositiveQuantity(int quantity)
    {
        Assert.Throws<ArgumentException>(() => new OrderItem(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Cơm gà",
            quantity,
            45_000m,
            null));
    }

    [Fact]
    public void Constructor_RejectsInvalidReferencesNameAndPrice()
    {
        Assert.Throws<ArgumentException>(() => new OrderItem(
            Guid.Empty,
            Guid.NewGuid(),
            "Cơm gà",
            1,
            45_000m,
            null));

        Assert.Throws<ArgumentException>(() => new OrderItem(
            Guid.NewGuid(),
            Guid.Empty,
            "Cơm gà",
            1,
            45_000m,
            null));

        Assert.Throws<ArgumentException>(() => new OrderItem(
            Guid.NewGuid(),
            Guid.NewGuid(),
            " ",
            1,
            45_000m,
            null));

        Assert.Throws<ArgumentException>(() => new OrderItem(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Cơm gà",
            1,
            -1m,
            null));
    }

    [Fact]
    public void KitchenLifecycle_RecordsProgressAndServesItem()
    {
        var item = CreateItem();

        item.MarkCooking();

        Assert.Equal("Cooking", item.Status);
        Assert.NotNull(item.StartedAt);

        item.MarkReady();

        Assert.Equal("Ready", item.Status);
        Assert.NotNull(item.CompletedAt);

        item.MarkServed();

        Assert.Equal("Served", item.Status);
        Assert.NotNull(item.UpdatedAt);
    }

    [Fact]
    public void ServedItem_CannotBeChangedOrCancelled()
    {
        var item = CreateServedItem();

        Assert.Throws<InvalidOperationException>(() =>
            item.UpdateQuantity(2));
        Assert.Throws<InvalidOperationException>(() =>
            item.MarkPending());
        Assert.Throws<InvalidOperationException>(() =>
            item.MarkCooking());
        Assert.Throws<InvalidOperationException>(() =>
            item.MarkReady());
        Assert.Throws<InvalidOperationException>(() =>
            item.Cancel());
    }

    [Fact]
    public void CancelledItem_CannotBeUpdatedOrPrepared()
    {
        var item = CreateItem();

        item.Cancel();

        Assert.Equal("Cancelled", item.Status);
        Assert.Throws<InvalidOperationException>(() =>
            item.UpdateQuantity(2));
        Assert.Throws<InvalidOperationException>(() =>
            item.MarkCooking());
        Assert.Throws<InvalidOperationException>(() =>
            item.MarkReady());
        Assert.Throws<InvalidOperationException>(() =>
            item.MarkServed());
    }

    [Fact]
    public void UpdateAndDecreaseQuantity_RecalculateTotal()
    {
        var item = CreateItem(quantity: 4, unitPrice: 25_000m);

        item.UpdateQuantity(5);

        Assert.Equal(5, item.Quantity);
        Assert.Equal(125_000m, item.TotalPrice);

        item.DecreaseQuantity(2);

        Assert.Equal(3, item.Quantity);
        Assert.Equal(75_000m, item.TotalPrice);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(4)]
    [InlineData(5)]
    public void DecreaseQuantity_RejectsInvalidAmount(int quantity)
    {
        var item = CreateItem(quantity: 4);

        Assert.Throws<ArgumentException>(() =>
            item.DecreaseQuantity(quantity));
    }

    private static OrderItem CreateItem(
        int quantity = 1,
        decimal unitPrice = 50_000m)
    {
        return new OrderItem(
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Món thử nghiệm",
            quantity,
            unitPrice,
            null);
    }

    private static OrderItem CreateServedItem()
    {
        var item = CreateItem();
        item.MarkCooking();
        item.MarkReady();
        item.MarkServed();
        return item;
    }
}
