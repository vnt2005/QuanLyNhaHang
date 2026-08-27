using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class QrOrderAbuseTests
{
    [Fact]
    public async Task AnonymousQrOrder_RejectsMoreThanFiveOfSameItem()
    {
        using var factory = new ApiWebApplicationFactory();
        var scenario = await SeedScenarioAsync(factory);
        using var client = factory.CreateHttpsClient();

        using var response = await client.PostAsJsonAsync(
            $"/api/qr-order/{scenario.Token}/orders",
            new
            {
                note = "Thử gọi quá giới hạn một món",
                items = new[]
                {
                    new
                    {
                        menuItemId = scenario.MenuItemId,
                        quantity = 6,
                        note = (string?)null
                    }
                }
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        Assert.Contains(
            "1 đến 5",
            json.RootElement.GetProperty("message").GetString());
    }

    [Fact]
    public async Task AnonymousQrOrder_BlocksFourthBurstForSameTable()
    {
        using var factory = new ApiWebApplicationFactory();
        var scenario = await SeedScenarioAsync(factory);
        using var client = factory.CreateHttpsClient();

        for (var index = 1; index <= 3; index++)
        {
            using var response = await client.PostAsJsonAsync(
                $"/api/qr-order/{scenario.Token}/orders",
                new
                {
                    note = $"Lượt gọi {index}",
                    items = new[]
                    {
                        new
                        {
                            menuItemId = scenario.MenuItemId,
                            quantity = 1,
                            note = (string?)null
                        }
                    }
                });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        using var blockedResponse = await client.PostAsJsonAsync(
            $"/api/qr-order/{scenario.Token}/orders",
            new
            {
                note = "Lượt gọi thứ tư",
                items = new[]
                {
                    new
                    {
                        menuItemId = scenario.MenuItemId,
                        quantity = 1,
                        note = (string?)null
                    }
                }
            });

        Assert.Equal(HttpStatusCode.BadRequest, blockedResponse.StatusCode);
        using var json = await ReadJsonAsync(blockedResponse);
        Assert.Contains(
            "đã gửi 3 lượt gọi món",
            json.RootElement.GetProperty("message").GetString());
    }

    private static async Task<QrScenario> SeedScenarioAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var area = new Area(
            $"Khu QR {Guid.NewGuid():N}",
            null);
        var table = new RestaurantTable(
            area.Id,
            $"Bàn QR {Guid.NewGuid():N}",
            4,
            null);
        var category = new MenuCategory(
            $"QR category {Guid.NewGuid():N}",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            "Món QR chống spam",
            null,
            60_000m,
            null);
        var token = $"qr-{Guid.NewGuid():N}";
        var qrCode = new TableQrCode(
            table.Id,
            token,
            $"https://example.test/qr/{token}",
            null);

        context.Areas.Add(area);
        context.RestaurantTables.Add(table);
        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        context.TableQrCodes.Add(qrCode);
        await context.SaveChangesAsync();

        return new QrScenario(token, menuItem.Id);
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record QrScenario(string Token, Guid MenuItemId);
}
