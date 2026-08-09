using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class InventoryWorkflowTests
{
    [Fact]
    public async Task CancelTransaction_RequiresReverseChronologicalOrder()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var ingredientId = await SeedIngredientAsync(factory, 20m);

        var importId = await CreateTransactionAsync(
            client,
            "/api/inventory-transactions/import",
            new
            {
                ingredientId,
                quantity = 10m,
                unitPrice = 50_000m,
                note = "Nhập thêm"
            });

        var exportId = await CreateTransactionAsync(
            client,
            "/api/inventory-transactions/export",
            new
            {
                ingredientId,
                quantity = 5m,
                note = "Xuất sử dụng"
            });

        using var staleCancelResponse = await client.DeleteAsync(
            $"/api/inventory-transactions/{importId}");

        Assert.Equal(HttpStatusCode.BadRequest, staleCancelResponse.StatusCode);

        using var staleCancelJson = await ReadJsonAsync(staleCancelResponse);
        Assert.Contains(
            "tồn kho đã thay đổi",
            staleCancelJson.RootElement
                .GetProperty("message")
                .GetString());

        await AssertInventoryStateAsync(
            factory,
            ingredientId,
            25m,
            (importId, "Completed"),
            (exportId, "Completed"));

        using var latestCancelResponse = await client.DeleteAsync(
            $"/api/inventory-transactions/{exportId}");
        Assert.Equal(HttpStatusCode.OK, latestCancelResponse.StatusCode);

        using var importCancelResponse = await client.DeleteAsync(
            $"/api/inventory-transactions/{importId}");
        Assert.Equal(HttpStatusCode.OK, importCancelResponse.StatusCode);

        await AssertInventoryStateAsync(
            factory,
            ingredientId,
            20m,
            (importId, "Cancelled"),
            (exportId, "Cancelled"));
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"inventory-{Guid.NewGuid():N}@example.com";
        const string password = "Password123!";

        await factory.SeedUserAsync(email, password);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });

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

    private static async Task<Guid> SeedIngredientAsync(
        ApiWebApplicationFactory factory,
        decimal currentStock)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        await context.Database.EnsureCreatedAsync();

        var category = new IngredientCategory(
            $"Danh mục {Guid.NewGuid():N}",
            "Dữ liệu integration test");
        var ingredient = new Ingredient(
            category.Id,
            $"NL-{Guid.NewGuid():N}",
            "Nguyên liệu kiểm thử",
            "kg",
            currentStock,
            5m,
            50_000m,
            null);

        context.IngredientCategories.Add(category);
        context.Ingredients.Add(ingredient);
        await context.SaveChangesAsync();

        return ingredient.Id;
    }

    private static async Task<Guid> CreateTransactionAsync(
        HttpClient client,
        string endpoint,
        object body)
    {
        using var response = await client.PostAsJsonAsync(endpoint, body);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        return json.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();
    }

    private static async Task AssertInventoryStateAsync(
        ApiWebApplicationFactory factory,
        Guid ingredientId,
        decimal expectedStock,
        params (Guid Id, string Status)[] transactions)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var ingredient = await context.Ingredients
            .AsNoTracking()
            .SingleAsync(x => x.Id == ingredientId);
        Assert.Equal(expectedStock, ingredient.CurrentStock);

        foreach (var expected in transactions)
        {
            var transaction = await context.InventoryTransactions
                .AsNoTracking()
                .SingleAsync(x => x.Id == expected.Id);
            Assert.Equal(expected.Status, transaction.Status);
        }
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
