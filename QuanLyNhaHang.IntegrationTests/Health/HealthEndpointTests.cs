using System.Net;
using System.Text.Json;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Health;

public sealed class HealthEndpointTests
{
    [Theory]
    [InlineData("/health")]
    [InlineData("/health/live")]
    public async Task LivenessEndpoints_ReturnHealthySelfCheck(
        string endpoint)
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        using var response = await client.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "application/json",
            response.Content.Headers.ContentType?.MediaType);

        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());
        var root = document.RootElement;

        Assert.Equal("Healthy", root.GetProperty("status").GetString());

        var checks = root.GetProperty("checks")
            .EnumerateArray()
            .ToArray();

        var selfCheck = Assert.Single(checks);
        Assert.Equal(
            "self",
            selfCheck.GetProperty("name").GetString());
        Assert.Equal(
            "Healthy",
            selfCheck.GetProperty("status").GetString());
    }

    [Fact]
    public async Task ReadinessEndpoint_IncludesDatabaseCheck()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        using var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var document = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());
        var root = document.RootElement;

        Assert.Equal("Healthy", root.GetProperty("status").GetString());

        var checks = root.GetProperty("checks")
            .EnumerateArray()
            .ToDictionary(
                check => check.GetProperty("name").GetString()!,
                check => check.GetProperty("status").GetString());

        Assert.Equal("Healthy", checks["self"]);
        Assert.Equal("Healthy", checks["database"]);
    }
}
