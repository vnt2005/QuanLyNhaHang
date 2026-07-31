using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Features.Kitchen.Commands.Update;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class KitchenOrderStatusSynchronizationTests
{
    [Fact]
    public async Task Handle_SynchronizesParentOrderUntilEveryActiveItemIsServed()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"kitchen-order-status-{Guid.NewGuid()}")
            .Options;

        await using var context = new ApplicationDbContext(options);

        var order = new Order(Guid.NewGuid(), "ORD-KITCHEN-STATUS", null);
        var firstItem = new OrderItem(
            order.Id,
            Guid.NewGuid(),
            "Món thứ nhất",
            1,
            50_000m,
            null);
        var secondItem = new OrderItem(
            order.Id,
            Guid.NewGuid(),
            "Món thứ hai",
            1,
            60_000m,
            null);

        context.AddRange(order, firstItem, secondItem);
        await context.SaveChangesAsync();

        var handler = new UpdateKitchenOrderItemStatusCommandHandler(context);

        await handler.Handle(
            new UpdateKitchenOrderItemStatusCommand
            {
                OrderItemId = firstItem.Id,
                Status = "Cooking"
            },
            CancellationToken.None);

        Assert.Equal("Cooking", order.Status);

        await handler.Handle(
            new UpdateKitchenOrderItemStatusCommand
            {
                OrderItemId = firstItem.Id,
                Status = "Ready"
            },
            CancellationToken.None);
        await handler.Handle(
            new UpdateKitchenOrderItemStatusCommand
            {
                OrderItemId = firstItem.Id,
                Status = "Served"
            },
            CancellationToken.None);

        Assert.Equal("Cooking", order.Status);

        await handler.Handle(
            new UpdateKitchenOrderItemStatusCommand
            {
                OrderItemId = secondItem.Id,
                Status = "Cooking"
            },
            CancellationToken.None);
        await handler.Handle(
            new UpdateKitchenOrderItemStatusCommand
            {
                OrderItemId = secondItem.Id,
                Status = "Ready"
            },
            CancellationToken.None);
        await handler.Handle(
            new UpdateKitchenOrderItemStatusCommand
            {
                OrderItemId = secondItem.Id,
                Status = "Served"
            },
            CancellationToken.None);

        Assert.Equal("Served", order.Status);

        context.ChangeTracker.Clear();
        var persistedOrder = await context.Orders.SingleAsync(x => x.Id == order.Id);
        Assert.Equal("Served", persistedOrder.Status);
    }
}
