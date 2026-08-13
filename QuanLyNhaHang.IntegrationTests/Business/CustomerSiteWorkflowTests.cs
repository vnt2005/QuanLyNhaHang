using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class CustomerSiteWorkflowTests
{
    [Fact]
    public async Task AnonymousCustomer_CanBrowseWebsiteAndSendReservation()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        var scenario = await SeedCustomerSiteAsync(factory);

        using var bootstrapResponse = await client.GetAsync(
            "/api/customer-site/bootstrap");

        Assert.Equal(HttpStatusCode.OK, bootstrapResponse.StatusCode);
        using var bootstrapJson = await ReadJsonAsync(bootstrapResponse);
        var root = bootstrapJson.RootElement;

        Assert.Equal(
            "Nhà hàng Website Test",
            root.GetProperty("restaurant")
                .GetProperty("restaurantName")
                .GetString());
        Assert.Contains(
            root.GetProperty("menuItems").EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == scenario.MenuItemId);
        Assert.Contains(
            root.GetProperty("reservationTables").EnumerateArray(),
            table => table.GetProperty("id").GetGuid() == scenario.TableId);

        using var reservationResponse = await client.PostAsJsonAsync(
            "/api/customer-site/reservations",
            new
            {
                restaurantTableId = scenario.TableId,
                customerName = "Khách website",
                phoneNumber = "0900000026",
                email = "customer-site@example.com",
                numberOfGuests = 3,
                reservationTime = DateTime.UtcNow.AddDays(2),
                note = "Đặt trực tiếp từ website khách hàng."
            });

        Assert.Equal(HttpStatusCode.OK, reservationResponse.StatusCode);
        using var reservationJson = await ReadJsonAsync(reservationResponse);
        var data = reservationJson.RootElement.GetProperty("data");

        Assert.Equal("Pending", data.GetProperty("status").GetString());
        Assert.Equal(
            scenario.TableName,
            data.GetProperty("restaurantTableName").GetString());

        using var verificationScope = factory.Services.CreateScope();
        var context = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var persisted = await context.Reservations
            .AsNoTracking()
            .SingleAsync(reservation =>
                reservation.CustomerName == "Khách website");

        Assert.Equal(0m, persisted.DepositAmount);
        Assert.Equal(scenario.TableId, persisted.RestaurantTableId);
    }

    private static async Task<CustomerSiteScenario> SeedCustomerSiteAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        await context.Database.EnsureCreatedAsync();

        var setting = new RestaurantSetting(
            "Nhà hàng Website Test",
            "128 Nguyễn Huệ, Quận 1",
            "02838222026",
            "hello@example.com",
            null,
            null,
            null,
            8m,
            0m,
            "VND",
            "10:30",
            "22:30",
            null,
            "Chào mừng bạn đến website khách hàng.");
        var category = new MenuCategory(
            "Món chính website",
            "Danh mục công khai",
            1);
        var menuItem = new MenuItem(
            category.Id,
            "Phở website",
            "Món hiển thị cho khách.",
            89_000m,
            null);
        var area = new Area(
            "Khu website",
            "Khu vực có thể đặt bàn trực tuyến.");
        var table = new RestaurantTable(
            area.Id,
            "Bàn Website 01",
            4,
            null);

        context.RestaurantSettings.Add(setting);
        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        context.Areas.Add(area);
        context.RestaurantTables.Add(table);
        await context.SaveChangesAsync();

        return new CustomerSiteScenario(
            table.Id,
            table.Name,
            menuItem.Id);
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record CustomerSiteScenario(
        Guid TableId,
        string TableName,
        Guid MenuItemId);
}
