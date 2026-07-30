using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class AreaPaginationWorkflowTests
{
    [Fact]
    public async Task CreateArea_ThenPaginatedList_ReturnsCreatedAreaInsideItems()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var areaName = $"Khu vực test {suffix}";

        using var createResponse = await client.PostAsJsonAsync(
            "/api/Areas",
            new
            {
                name = areaName,
                description = "Kiểm tra dữ liệu phân trang khu vực"
            });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);

        using var listResponse = await client.GetAsync(
            $"/api/Areas/paginated?keyword={Uri.EscapeDataString(areaName)}&pageNumber=1&pageSize=12");

        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        using var json = await ReadJsonAsync(listResponse);
        var root = json.RootElement;
        var items = root.GetProperty("items");

        Assert.Equal(JsonValueKind.Array, items.ValueKind);
        Assert.Single(items.EnumerateArray());

        var area = items[0];
        Assert.Equal(areaName, area.GetProperty("name").GetString());
        Assert.True(area.GetProperty("isActive").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(area.GetProperty("id").GetString()));

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
        var email = $"area-pagination-{suffix}@example.com";
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
