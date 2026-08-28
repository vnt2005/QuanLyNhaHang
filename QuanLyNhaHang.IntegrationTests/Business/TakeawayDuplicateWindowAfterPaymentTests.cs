using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Features.CustomerOrders.Commands.CreateTakeaway;
using QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class TakeawayDuplicateWindowAfterPaymentTests
{
    [Fact]
    public async Task RecentServedPaidTakeaway_DoesNotBlockNextTakeaway()
    {
        using var factory = new ApiWebApplicationFactory();
        const string phoneNumber = "0901555001";

        Guid menuItemId;
        using (var seedScope = factory.Services.CreateScope())
        {
            var context = seedScope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            await context.Database.EnsureCreatedAsync();

            var category = new MenuCategory(
                $"Paid duplicate category {Guid.NewGuid():N}",
                null,
                1);
            var menuItem = new MenuItem(
                category.Id,
                "Món cho đơn kế tiếp",
                null,
                50_000m,
                null);
            var oldOrder = Order.CreateTakeaway(
                $"ORD-{Guid.NewGuid():N}",
                "Khách đã thanh toán",
                phoneNumber,
                null,
                null);
            var oldItem = new OrderItem(
                oldOrder.Id,
                menuItem.Id,
                menuItem.Name,
                1,
                menuItem.Price,
                null);
            oldItem.MarkCooking();
            oldItem.MarkReady();
            oldItem.MarkServed();
            oldOrder.MarkServed();
            oldOrder.UpdateTotalAmount(oldItem.TotalPrice);

            var payment = new Payment(
                oldOrder.Id,
                oldOrder.TotalAmount,
                0m,
                0m,
                oldOrder.TotalAmount,
                "BankTransfer",
                "Đơn cũ đã thanh toán nhưng còn kẹt Served");

            context.MenuCategories.Add(category);
            context.MenuItems.Add(menuItem);
            context.Orders.Add(oldOrder);
            context.OrderItems.Add(oldItem);
            context.Payments.Add(payment);
            await context.SaveChangesAsync();

            menuItemId = menuItem.Id;
        }

        using var createScope = factory.Services.CreateScope();
        var mediator = createScope.ServiceProvider.GetRequiredService<IMediator>();
        var result = await mediator.Send(new CreateTakeawayOrderCommand
        {
            CustomerName = "Khách đặt tiếp",
            PhoneNumber = phoneNumber,
            Items =
            [
                new CreateQrOrderItemCommand
                {
                    MenuItemId = menuItemId,
                    Quantity = 1
                }
            ]
        });

        Assert.NotNull(result);
        Assert.Equal("Pending", result.Status);

        var verificationContext = createScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        Assert.Equal(
            2,
            await verificationContext.Orders.CountAsync(order =>
                order.OrderType == "Takeaway" &&
                order.CustomerPhoneNumber == phoneNumber));
    }

    [Fact]
    public async Task RecentCookingPaidTakeaway_StillBlocksNextTakeaway()
    {
        using var factory = new ApiWebApplicationFactory();
        const string phoneNumber = "0901555002";

        Guid menuItemId;
        using (var seedScope = factory.Services.CreateScope())
        {
            var context = seedScope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            await context.Database.EnsureCreatedAsync();

            var category = new MenuCategory(
                $"Cooking duplicate category {Guid.NewGuid():N}",
                null,
                1);
            var menuItem = new MenuItem(
                category.Id,
                "Món đang nấu",
                null,
                60_000m,
                null);
            var oldOrder = Order.CreateTakeaway(
                $"ORD-{Guid.NewGuid():N}",
                "Khách trả tiền sớm",
                phoneNumber,
                null,
                null);
            var oldItem = new OrderItem(
                oldOrder.Id,
                menuItem.Id,
                menuItem.Name,
                1,
                menuItem.Price,
                null);
            oldItem.MarkCooking();
            oldOrder.MarkCooking();
            oldOrder.UpdateTotalAmount(oldItem.TotalPrice);

            var payment = new Payment(
                oldOrder.Id,
                oldOrder.TotalAmount,
                0m,
                0m,
                oldOrder.TotalAmount,
                "BankTransfer",
                "Khách thanh toán trước khi bếp làm xong");

            context.MenuCategories.Add(category);
            context.MenuItems.Add(menuItem);
            context.Orders.Add(oldOrder);
            context.OrderItems.Add(oldItem);
            context.Payments.Add(payment);
            await context.SaveChangesAsync();

            menuItemId = menuItem.Id;
        }

        using var createScope = factory.Services.CreateScope();
        var mediator = createScope.ServiceProvider.GetRequiredService<IMediator>();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            mediator.Send(new CreateTakeawayOrderCommand
            {
                CustomerName = "Khách cố đặt thêm",
                PhoneNumber = phoneNumber,
                Items =
                [
                    new CreateQrOrderItemCommand
                    {
                        MenuItemId = menuItemId,
                        Quantity = 1
                    }
                ]
            }));

        Assert.Contains("chưa hoàn tất", exception.Message);
    }
}
