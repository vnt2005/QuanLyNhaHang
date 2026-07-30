using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class MenuPaginationWorkflowTests
{
    [Fact]
    public async Task CreateMenuCategory_ThenPaginatedList_ReturnsCreatedCategoryInsideItems()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var categoryName = $"Danh mục test {suffix}";

        using var createResponse = await client.PostAsJsonAsync(
            "/api/MenuCategories",
            new
            {
                name = categoryName,
                description = "Kiểm tra danh mục vừa tạo hiển thị trong danh sách",
                displayOrder = 25
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        using var listResponse = await client.GetAsync(
            $"/api/MenuCategories/paginated?keyword={Uri.EscapeDataString(categoryName)}&pageNumber=1&pageSize=12");

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        using var json = await ReadJsonAsync(listResponse);
        var root = json.RootElement;
        var items = root.GetProperty("items");

        Assert.Equal(JsonValueKind.Array, items.ValueKind);
        Assert.Single(items.EnumerateArray());

        var category = items[0];
        Assert.Equal(categoryName, category.GetProperty("name").GetString());
        Assert.Equal(25, category.GetProperty("displayOrder").GetInt32());
        Assert.True(category.GetProperty("isActive").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(category.GetProperty("id").GetString()));

        AssertPaginationMetadata(root);
    }

    [Fact]
    public async Task CreateMenuItem_ThenPaginatedList_ReturnsCreatedItemInsideItems()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var categoryName = $"Danh mục món test {suffix}";
        var itemName = $"Món ăn test {suffix}";
        const decimal price = 125000m;

        var categoryId = await CreateMenuCategoryAsync(client, categoryName);

        using var createResponse = await client.PostAsJsonAsync(
            "/api/MenuItems",
            new
            {
                menuCategoryId = categoryId,
                name = itemName,
                description = "Kiểm tra món vừa tạo hiển thị trong danh sách",
                price,
                imageUrl = (string?)null
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        using var listResponse = await client.GetAsync(
            $"/api/MenuItems/paginated?keyword={Uri.EscapeDataString(itemName)}&pageNumber=1&pageSize=12");

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        using var json = await ReadJsonAsync(listResponse);
        var root = json.RootElement;
        var items = root.GetProperty("items");

        Assert.Equal(JsonValueKind.Array, items.ValueKind);
        Assert.Single(items.EnumerateArray());

        var item = items[0];
        Assert.Equal(itemName, item.GetProperty("name").GetString());
        Assert.Equal(categoryId, item.GetProperty("menuCategoryId").GetGuid());
        Assert.Equal(categoryName, item.GetProperty("menuCategoryName").GetString());
        Assert.Equal(price, item.GetProperty("price").GetDecimal());
        Assert.True(item.GetProperty("isAvailable").GetBoolean());
        Assert.True(item.GetProperty("isActive").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(item.GetProperty("id").GetString()));

        AssertPaginationMetadata(root);
    }

    private static async Task<Guid> CreateMenuCategoryAsync(
        HttpClient client,
        string categoryName)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/MenuCategories",
            new
            {
                name = categoryName,
                description = "Danh mục dùng kiểm tra phân trang món ăn",
                displayOrder = 1
            });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        return json.RootElement.GetProperty("id").GetGuid();
    }

    private static void AssertPaginationMetadata(JsonElement root)
    {
        Assert.Equal(1, root.GetProperty("pageNumber").GetInt32());
        Assert.Equal(1, root.GetProperty("totalPages").GetInt32());
        Assert.Equal(1, root.GetProperty("totalCount").GetInt32());
        Assert.False(root.GetProperty("hasPreviousPage").GetBoolean());
        Assert.False(root.GetProperty("hasNextPage").GetBoolean());
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"menu-pagination-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";

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

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
