using System.Net;
using System.Text;
using System.Text.Json;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class AnonymousTakeawayAbuseTests
{
    [Fact]
    public async Task FifthAnonymousTakeawayAttempt_BlocksDeviceAndIpForThirtyMinutes()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        const string clientId = "anonymous-abuse-device-001";

        for (var index = 0; index < 4; index++)
        {
            using var response = await SendInvalidTakeawayAttemptAsync(
                client,
                clientId,
                $"anonymous-attempt-{index}");

            Assert.NotEqual(HttpStatusCode.TooManyRequests, response.StatusCode);
        }

        using var blockedResponse = await SendInvalidTakeawayAttemptAsync(
            client,
            clientId,
            "anonymous-attempt-4");

        Assert.Equal(HttpStatusCode.TooManyRequests, blockedResponse.StatusCode);
        Assert.True(blockedResponse.Headers.TryGetValues("Retry-After", out var retryValues));
        Assert.True(int.Parse(retryValues.Single()) >= 29 * 60);

        var body = await blockedResponse.Content.ReadAsStringAsync();
        using var json = JsonDocument.Parse(body);
        Assert.Contains(
            "30 phút",
            json.RootElement.GetProperty("message").GetString());
    }

    private static async Task<HttpResponseMessage> SendInvalidTakeawayAttemptAsync(
        HttpClient client,
        string clientId,
        string idempotencyKey)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "/api/customer-site/takeaway-orders");
        request.Headers.Add("X-Client-Id", clientId);
        request.Headers.Add("Idempotency-Key", idempotencyKey);
        request.Content = new StringContent(
            "{}",
            Encoding.UTF8,
            "application/json");

        return await client.SendAsync(request);
    }
}
