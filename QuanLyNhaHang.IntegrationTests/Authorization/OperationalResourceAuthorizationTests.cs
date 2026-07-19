using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class OperationalResourceAuthorizationTests
{
    [Theory]
    [InlineData("/api/ingredients")]
    [InlineData("/api/ingredient-categories")]
    [InlineData("/api/menucategories")]
    [InlineData("/api/areas")]
    [InlineData("/api/table-qr-codes")]
    public async Task OperationalReadEndpoints_RequireAuthentication(
        string endpoint)
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        using var response = await client.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(
        SystemRoles.Staff,
        "POST",
        "/api/ingredients")]
    [InlineData(
        SystemRoles.Staff,
        "POST",
        "/api/inventory-transactions/import")]
    [InlineData(
        SystemRoles.Kitchen,
        "POST",
        "/api/reservations")]
    [InlineData(
        SystemRoles.Kitchen,
        "POST",
        "/api/menuitems")]
    [InlineData(
        SystemRoles.Cashier,
        "PATCH",
        "/api/menuitems/00000000-0000-0000-0000-000000000001/availability")]
    [InlineData(
        SystemRoles.Cashier,
        "POST",
        "/api/restauranttables")]
    public async Task RoleWithoutRequiredPermission_MutationIsForbidden(
        string role,
        string method,
        string endpoint)
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateRoleAsync(factory, client, role);

        using var request = new HttpRequestMessage(
            new HttpMethod(method),
            endpoint)
        {
            Content = JsonContent.Create(new { })
        };
        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Manager_CanManageAndTransactInventory()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateRoleAsync(factory, client, SystemRoles.Manager);

        var suffix = Guid.NewGuid().ToString("N");

        using var categoryResponse = await client.PostAsJsonAsync(
            "/api/ingredient-categories",
            new
            {
                name = "Danh mục " + suffix,
                description = "Integration test"
            });

        Assert.Equal(HttpStatusCode.OK, categoryResponse.StatusCode);

        using var categoryJson = await ReadJsonAsync(categoryResponse);
        var categoryId = categoryJson.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();

        using var ingredientResponse = await client.PostAsJsonAsync(
            "/api/ingredients",
            new
            {
                ingredientCategoryId = categoryId,
                ingredientCode = "ING-" + suffix[..8],
                name = "Nguyên liệu " + suffix,
                unit = "kg",
                currentStock = 5m,
                minimumStock = 1m,
                costPrice = 10_000m,
                note = "Integration test"
            });

        Assert.Equal(HttpStatusCode.OK, ingredientResponse.StatusCode);

        using var ingredientJson = await ReadJsonAsync(ingredientResponse);
        var ingredientId = ingredientJson.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();

        using var importResponse = await client.PostAsJsonAsync(
            "/api/inventory-transactions/import",
            new
            {
                ingredientId,
                quantity = 2m,
                unitPrice = 12_000m,
                note = "Manager imports stock"
            });

        Assert.Equal(HttpStatusCode.OK, importResponse.StatusCode);

        using var adjustResponse = await client.PostAsJsonAsync(
            "/api/inventory-transactions/adjust",
            new
            {
                ingredientId,
                newStock = 10m,
                unitPrice = 12_000m,
                note = "Manager reconciles stock"
            });

        Assert.Equal(HttpStatusCode.OK, adjustResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var ingredient = await context.Ingredients
            .AsNoTracking()
            .SingleAsync(x => x.Id == ingredientId);
        var transactions = await context.InventoryTransactions
            .AsNoTracking()
            .Where(x => x.IngredientId == ingredientId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync();

        Assert.Equal(10m, ingredient.CurrentStock);
        Assert.Collection(
            transactions,
            transaction =>
            {
                Assert.Equal("Import", transaction.TransactionType);
                Assert.Equal(5m, transaction.StockBefore);
                Assert.Equal(7m, transaction.StockAfter);
            },
            transaction =>
            {
                Assert.Equal("Adjustment", transaction.TransactionType);
                Assert.Equal(7m, transaction.StockBefore);
                Assert.Equal(10m, transaction.StockAfter);
            });
    }

    [Fact]
    public async Task Staff_CanCreateAndCancelReservation()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateRoleAsync(factory, client, SystemRoles.Staff);

        var tableId = await SeedTableAsync(factory);

        using var createResponse = await client.PostAsJsonAsync(
            "/api/reservations",
            new
            {
                restaurantTableId = tableId,
                customerName = "Khách integration",
                phoneNumber = "0901234567",
                email = "reservation@example.com",
                numberOfGuests = 2,
                reservationTime = DateTime.UtcNow.AddDays(1),
                depositAmount = 100_000m,
                note = "Staff creates reservation"
            });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        using var createJson = await ReadJsonAsync(createResponse);
        var reservationId = createJson.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();

        using var cancelResponse = await client.DeleteAsync(
            "/api/reservations/" + reservationId);

        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var reservation = await context.Reservations
            .AsNoTracking()
            .SingleAsync(x => x.Id == reservationId);

        Assert.Equal("Cancelled", reservation.Status);
        Assert.NotNull(reservation.CancelledAt);
    }

    [Fact]
    public async Task Kitchen_CanChangeMenuAvailability()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateRoleAsync(factory, client, SystemRoles.Kitchen);

        var menuItemId = await SeedMenuItemAsync(factory);

        using var response = await client.PatchAsJsonAsync(
            "/api/menuitems/" + menuItemId + "/availability",
            new
            {
                id = menuItemId,
                isAvailable = false
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var menuItem = await context.MenuItems
            .AsNoTracking()
            .SingleAsync(x => x.Id == menuItemId);

        Assert.False(menuItem.IsAvailable);
    }

    [Fact]
    public async Task Staff_CanChangeTableOperationalStatus()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateRoleAsync(factory, client, SystemRoles.Staff);

        var tableId = await SeedTableAsync(factory);

        using var response = await client.PatchAsJsonAsync(
            "/api/restauranttables/" + tableId + "/status",
            new
            {
                id = tableId,
                status = "Cleaning"
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var table = await context.RestaurantTables
            .AsNoTracking()
            .SingleAsync(x => x.Id == tableId);

        Assert.Equal("Cleaning", table.Status);
    }

    private static async Task AuthenticateRoleAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string role)
    {
        var email = "operational-" +
            role.ToLowerInvariant() +
            "-" +
            Guid.NewGuid().ToString("N") +
            "@example.com";
        const string password = "Password123!";

        await factory.SeedUserAsync(
            email,
            password,
            role: role);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new
            {
                email,
                password
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var token = json.RootElement
            .GetProperty("data")
            .GetProperty("token")
            .GetString();

        Assert.False(string.IsNullOrWhiteSpace(token));

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }

    private static async Task<Guid> SeedTableAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        await context.Database.EnsureCreatedAsync();

        var suffix = Guid.NewGuid().ToString("N");
        var area = new Area(
            "Khu vực " + suffix,
            "Integration test");
        var table = new RestaurantTable(
            area.Id,
            "Bàn " + suffix,
            4,
            null);

        context.Areas.Add(area);
        context.RestaurantTables.Add(table);
        await context.SaveChangesAsync();

        return table.Id;
    }

    private static async Task<Guid> SeedMenuItemAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        await context.Database.EnsureCreatedAsync();

        var suffix = Guid.NewGuid().ToString("N");
        var category = new MenuCategory(
            "Danh mục " + suffix,
            null,
            1);
        var item = new MenuItem(
            category.Id,
            "Món " + suffix,
            null,
            100_000m,
            null);

        context.MenuCategories.Add(category);
        context.MenuItems.Add(item);
        await context.SaveChangesAsync();

        return item.Id;
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
