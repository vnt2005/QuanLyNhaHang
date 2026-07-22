using System.Net;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Security;

public sealed class CorsPolicyTests
{
    private const string AllowedOrigin =
        "https://frontend.example.test";

    [Fact]
    public async Task Preflight_FromConfiguredOrigin_ReturnsCorsHeaders()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        using var request = CreatePreflightRequest(AllowedOrigin);

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(
            AllowedOrigin,
            Assert.Single(
                response.Headers.GetValues(
                    "Access-Control-Allow-Origin")));

        var allowedMethods = string.Join(
            ",",
            response.Headers.GetValues(
                "Access-Control-Allow-Methods"));

        Assert.Contains(
            "POST",
            allowedMethods,
            StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Preflight_FromUntrustedOrigin_DoesNotReturnCorsHeaders()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        using var request = CreatePreflightRequest(
            "https://untrusted.example.test");

        using var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.False(
            response.Headers.Contains(
                "Access-Control-Allow-Origin"));
    }

    private static HttpRequestMessage CreatePreflightRequest(
        string origin)
    {
        var request = new HttpRequestMessage(
            HttpMethod.Options,
            "/api/auth/login");

        request.Headers.Add("Origin", origin);
        request.Headers.Add(
            "Access-Control-Request-Method",
            "POST");
        request.Headers.Add(
            "Access-Control-Request-Headers",
            "authorization,content-type");

        return request;
    }
}
