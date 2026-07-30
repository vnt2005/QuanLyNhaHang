using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Features.TableOperations.Commands.Create;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class SplitTableCommandHandlerTests
{
    [Fact]
    public async Task Handle_PartialPendingItem_PreservesSourceAndTargetTotals()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"split-table-{Guid.NewGuid()}")
            .Options;

        await using var context = new ApplicationDbContext(options);

        var area = new Area("Tầng trệt", null);
        var sourceTable = new RestaurantTable(area.Id, "Bàn 01", 4, null);
        var targetTable = new RestaurantTable(area.Id, "Bàn 02", 4, null);
        sourceTable.MarkOccupied();

        var sourceOrder = new Order(sourceTable.Id, "ORD-SOURCE", null);
        var sourceItem = new OrderItem(
            sourceOrder.Id,
            Guid.NewGuid(),
            "Cơm chiên",
            4,
            100_000m,
            null);
        sourceOrder.UpdateTotalAmount(sourceItem.TotalPrice);

        context.AddRange(area, sourceTable, targetTable, sourceOrder, sourceItem);
        await context.SaveChangesAsync();

        var handler = new SplitTableCommandHandler(context);
        var result = await handler.Handle(
            new SplitTableCommand
            {
                SourceOrderId = sourceOrder.Id,
                TargetTableId = targetTable.Id,
                Items =
                [
                    new SplitTableItemCommand
                    {
                        OrderItemId = sourceItem.Id,
                        Quantity = 2
                    }
                ]
            },
            CancellationToken.None);

        context.ChangeTracker.Clear();

        var persistedSourceOrder = await context.Orders.SingleAsync(x => x.Id == sourceOrder.Id);
        var persistedTargetOrder = await context.Orders.SingleAsync(x => x.Id == result.TargetOrderId);
        var persistedSourceTable = await context.RestaurantTables.SingleAsync(x => x.Id == sourceTable.Id);
        var persistedTargetTable = await context.RestaurantTables.SingleAsync(x => x.Id == targetTable.Id);
        var activeItems = await context.OrderItems
            .Where(x => x.Status != "Cancelled")
            .OrderBy(x => x.OrderId)
            .ToListAsync();

        Assert.Equal(200_000m, persistedSourceOrder.TotalAmount);
        Assert.Equal(200_000m, persistedTargetOrder.TotalAmount);
        Assert.Equal("Occupied", persistedSourceTable.Status);
        Assert.Equal("Occupied", persistedTargetTable.Status);

        var sourceItems = activeItems.Where(x => x.OrderId == persistedSourceOrder.Id).ToList();
        var targetItems = activeItems.Where(x => x.OrderId == persistedTargetOrder.Id).ToList();

        Assert.Single(sourceItems);
        Assert.Equal(2, sourceItems[0].Quantity);
        Assert.Equal(200_000m, sourceItems[0].TotalPrice);

        Assert.Single(targetItems);
        Assert.Equal(2, targetItems[0].Quantity);
        Assert.Equal(200_000m, targetItems[0].TotalPrice);

        var detail = Assert.Single(result.Details);
        Assert.Equal(2, detail.Quantity);
        Assert.Equal(200_000m, detail.TotalPrice);
    }
}
