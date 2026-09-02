using System.Net;
using System.Text;
using System.Text.Json;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Middleware;

public sealed class ValidationErrorResponseTests
{
    [Fact]
    public async Task InvalidJsonModel_ReturnsSanitized400WithoutTraceId()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        using var content = new StringContent(
            """
            {
              "email": { "unexpected": true },
              "password": "Password123!"
            }
            """,
            Encoding.UTF8,
            "application/json");

        using var response = await client.PostAsync(
            "/api/auth/login",
            content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var document = await JsonDocument.ParseAsync(stream);
        var root = document.RootElement;
        var raw = root.GetRawText();

        Assert.Equal(
            "Dữ liệu gửi lên không đúng định dạng.",
            root.GetProperty("message").GetString());
        Assert.False(root.TryGetProperty("traceId", out _));
        Assert.False(root.TryGetProperty("detail", out _));
        Assert.DoesNotContain("System.", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("could not be converted", raw, StringComparison.OrdinalIgnoreCase);
    }
}
