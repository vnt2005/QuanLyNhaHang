using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Features.Kitchen.Commands.Update;
using QuanLyNhaHang.Application.Features.Orders.Commands.AddOrderItem;
using QuanLyNhaHang.Application.Features.Orders.Commands.CancelOrderItem;
using QuanLyNhaHang.Application.Features.Orders.Commands.ChangeStatus;
using QuanLyNhaHang.Application.Features.Orders.Commands.Delete;
using QuanLyNhaHang.Application.Features.Orders.Commands.UpdateOrderItemQuantity;
using QuanLyNhaHang.Application.Features.Orders.Queries.GetWithPaginatedList;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class PaidOrderMutationGuardsTests
{
    [Fact]
    public async Task PaidCookingTakeaway_RejectsFinancialMutationsAndCancellation()
    {
        using var factory = new ApiWebApplicationFactory();

        Guid orderId;
        Guid orderItemId;
        Guid extraMenuItemId;

        using (var seedScope = factory.Services.CreateScope())
        {
            var context = seedScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await context.Database.EnsureCreatedAsync();

            var category = new MenuCategory(
                $"Paid guard category {Guid.NewGuid():N}",
                null,
                1);
            var firstMenuItem = new MenuItem(
                category.Id,
                "Món đã thanh toán",
                null,
                80_000m,
                null);
            var extraMenuItem = new MenuItem(
                category.Id,
                "Món không được thêm sau thanh toán",
                null,
                40_000m,
                null);
            var order = Order.CreateTakeaway(
                $"ORD-{Guid.NewGuid():N}",
                "Khách trả tiền sớm",
                "0901888001",
                null,
                null);
            var orderItem = new OrderItem(
                order.Id,
                firstMenuItem.Id,
                firstMenuItem.Name,
                1,
                firstMenuItem.Price,
                null);

            orderItem.MarkCooking();
            order.MarkCooking();
            order.UpdateTotalAmount(orderItem.TotalPrice);

            var seededPayment = new Payment(
                order.Id,
                order.TotalAmount,
                0m,
                0m,
                order.TotalAmount,
                "BankTransfer",
                "Thanh toán sớm để kiểm tra khóa dữ liệu");

            context.MenuCategories.Add(category);
            context.MenuItems.AddRange(firstMenuItem, extraMenuItem);
            context.Orders.Add(order);
            context.OrderItems.Add(orderItem);
            context.Payments.Add(seededPayment);
            await context.SaveChangesAsync();

            orderId = order.Id;
            orderItemId = orderItem.Id;
            extraMenuItemId = extraMenuItem.Id;
        }

        using (var actionScope = factory.Services.CreateScope())
        {
            var mediator = actionScope.ServiceProvider.GetRequiredService<IMediator>();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                mediator.Send(new AddOrderItemCommand
                {
                    OrderId = orderId,
                    MenuItemId = extraMenuItemId,
                    Quantity = 1
                }));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                mediator.Send(new UpdateOrderItemQuantityCommand
                {
                    OrderId = orderId,
                    OrderItemId = orderItemId,
                    Quantity = 2
                }));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                mediator.Send(new CancelOrderItemCommand
                {
                    OrderId = orderId,
                    OrderItemId = orderItemId
                }));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                mediator.Send(new UpdateKitchenOrderItemStatusCommand
                {
                    OrderItemId = orderItemId,
                    Status = "Cancelled"
                }));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                mediator.Send(new ChangeOrderStatusCommand
                {
                    Id = orderId,
                    Status = "Cancelled"
                }));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                mediator.Send(new DeleteOrderCommand(orderId)));
        }

        using var verificationScope = factory.Services.CreateScope();
        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var persistedOrder = await verificationContext.Orders
            .AsNoTracking()
            .SingleAsync(order => order.Id == orderId);
        var persistedItem = await verificationContext.OrderItems
            .AsNoTracking()
            .SingleAsync(item => item.Id == orderItemId);
        var itemCount = await verificationContext.OrderItems
            .AsNoTracking()
            .CountAsync(item => item.OrderId == orderId);
        var payment = await verificationContext.Payments
            .AsNoTracking()
            .SingleAsync(item => item.OrderId == orderId);

        Assert.Equal("Cooking", persistedOrder.Status);
        Assert.Equal("Cooking", persistedItem.Status);
        Assert.Equal(1, persistedItem.Quantity);
        Assert.Equal(1, itemCount);
        Assert.Equal("Paid", payment.Status);
    }

    [Fact]
    public async Task ReadyUnpaidTakeaway_IsIncludedInAdminPaymentCandidateQuery()
    {
        using var factory = new ApiWebApplicationFactory();

        Guid orderId;

        using (var seedScope = factory.Services.CreateScope())
        {
            var context = seedScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await context.Database.EnsureCreatedAsync();

            var category = new MenuCategory(
                $"Ready payment category {Guid.NewGuid():N}",
                null,
                1);
            var menuItem = new MenuItem(
                category.Id,
                "Món chờ thanh toán tại quầy",
                null,
                70_000m,
                null);
            var order = Order.CreateTakeaway(
                $"ORD-{Guid.NewGuid():N}",
                "Khách chờ thanh toán",
                "0901888002",
                null,
                null);
            var orderItem = new OrderItem(
                order.Id,
                menuItem.Id,
                menuItem.Name,
                1,
                menuItem.Price,
                null);

            orderItem.MarkCooking();
            orderItem.MarkReady();
            order.MarkReady();
            order.UpdateTotalAmount(orderItem.TotalPrice);

            context.MenuCategories.Add(category);
            context.MenuItems.Add(menuItem);
            context.Orders.Add(order);
            context.OrderItems.Add(orderItem);
            await context.SaveChangesAsync();

            orderId = order.Id;
        }

        using var queryScope = factory.Services.CreateScope();
        var mediator = queryScope.ServiceProvider.GetRequiredService<IMediator>();
        var result = await mediator.Send(new GetOrdersWithPaginatedListQuery
        {
            Status = "Served",
            OnlyUnpaid = true,
            IsActive = true,
            PageNumber = 1,
            PageSize = 100
        });

        var candidate = Assert.Single(result.Items, order => order.Id == orderId);
        Assert.Equal("Takeaway", candidate.OrderType);
        Assert.Equal("Ready", candidate.Status);
        Assert.False(candidate.IsPaid);
    }
}
