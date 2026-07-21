using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class RefreshTokenSessionTests
{
    [Fact]
    public async Task Refresh_RotatesTokenAndDetectsReuse()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Integration-Device-A/1.0");

        var credentials = await SeedCredentialsAsync(factory, role: "Staff");
        var firstLogin = await LoginAsync(client, credentials);

        SetBearer(client, firstLogin.AccessToken);
        Assert.Equal(
            HttpStatusCode.OK,
            (await client.GetAsync("/api/auth/me")).StatusCode);

        using var refreshResponse = await client.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = firstLogin.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, refreshResponse.StatusCode);

        var refreshed = await ReadAuthDataAsync(refreshResponse);
        Assert.NotEqual(firstLogin.SessionId, refreshed.SessionId);
        Assert.NotEqual(firstLogin.RefreshToken, refreshed.RefreshToken);
        Assert.False(string.IsNullOrWhiteSpace(refreshed.AccessToken));

        // Rotation thu hồi session cũ nên access token cũ mất hiệu lực ngay.
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/auth/me")).StatusCode);

        // Dùng lại refresh token cũ là dấu hiệu đánh cắp token và thu hồi toàn bộ phiên.
        using var replayResponse = await client.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = firstLogin.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replayResponse.StatusCode);

        SetBearer(client, refreshed.AccessToken);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesAccessTokenAndIsIdempotent()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        var credentials = await SeedCredentialsAsync(factory, role: "Staff");
        var login = await LoginAsync(client, credentials);
        SetBearer(client, login.AccessToken);

        using var logoutResponse = await client.PostAsJsonAsync(
            "/api/auth/logout",
            new { refreshToken = login.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await client.GetAsync("/api/auth/me")).StatusCode);

        // Không tiết lộ refresh token có tồn tại hay không.
        using var secondLogoutResponse = await client.PostAsJsonAsync(
            "/api/auth/logout",
            new { refreshToken = login.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, secondLogoutResponse.StatusCode);
    }

    [Fact]
    public async Task Sessions_CanListRevokeOneAndLogoutAll()
    {
        using var factory = new ApiWebApplicationFactory();
        using var deviceA = factory.CreateHttpsClient();
        using var deviceB = factory.CreateHttpsClient();
        deviceA.DefaultRequestHeaders.UserAgent.ParseAdd("Integration-Device-A/1.0");
        deviceB.DefaultRequestHeaders.UserAgent.ParseAdd("Integration-Device-B/1.0");

        var credentials = await SeedCredentialsAsync(factory, role: "Staff");
        var loginA = await LoginAsync(deviceA, credentials);
        var loginB = await LoginAsync(deviceB, credentials);
        SetBearer(deviceA, loginA.AccessToken);
        SetBearer(deviceB, loginB.AccessToken);

        using var sessionsResponse = await deviceA.GetAsync("/api/auth/sessions");
        Assert.Equal(HttpStatusCode.OK, sessionsResponse.StatusCode);

        using (var json = await ReadJsonAsync(sessionsResponse))
        {
            var sessions = json.RootElement.GetProperty("data");
            Assert.Equal(2, sessions.GetArrayLength());

            var currentSessions = sessions
                .EnumerateArray()
                .Count(item => item.GetProperty("isCurrent").GetBoolean());
            Assert.Equal(1, currentSessions);
        }

        using var revokeResponse = await deviceA.DeleteAsync(
            $"/api/auth/sessions/{loginB.SessionId}");
        Assert.Equal(HttpStatusCode.OK, revokeResponse.StatusCode);

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await deviceB.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await deviceA.GetAsync("/api/auth/me")).StatusCode);

        using var logoutAllResponse = await deviceA.PostAsync(
            "/api/auth/logout-all",
            content: null);
        Assert.Equal(HttpStatusCode.OK, logoutAllResponse.StatusCode);

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await deviceA.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Register_ReturnsSessionBoundTokens()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        var suffix = Guid.NewGuid().ToString("N");

        using var response = await client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                ho = "Refresh",
                ten = "Tester",
                email = $"refresh-register-{suffix}@example.com",
                phoneNumber = $"08{Random.Shared.Next(10000000, 99999999)}",
                password = $"Test-{suffix[..12]}!Aa1"
            });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var auth = await ReadAuthDataAsync(response);
        Assert.NotEqual(Guid.Empty, auth.SessionId);
        Assert.False(string.IsNullOrWhiteSpace(auth.AccessToken));
        Assert.False(string.IsNullOrWhiteSpace(auth.RefreshToken));

        SetBearer(client, auth.AccessToken);
        Assert.Equal(
            HttpStatusCode.OK,
            (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    private static async Task<TestCredentials> SeedCredentialsAsync(
        ApiWebApplicationFactory factory,
        string role)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var credentials = new TestCredentials(
            $"refresh-session-{suffix}@example.com",
            $"Test-{suffix[..12]}!Aa1");

        await factory.SeedUserAsync(
            credentials.Email,
            credentials.Password,
            role: role);

        return credentials;
    }

    private static async Task<AuthData> LoginAsync(
        HttpClient client,
        TestCredentials credentials)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new
            {
                email = credentials.Email,
                password = credentials.Password
            });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        return await ReadAuthDataAsync(response);
    }

    private static async Task<AuthData> ReadAuthDataAsync(
        HttpResponseMessage response)
    {
        using var json = await ReadJsonAsync(response);
        var data = json.RootElement.GetProperty("data");

        return new AuthData(
            data.GetProperty("sessionId").GetGuid(),
            data.GetProperty("token").GetString()!,
            data.GetProperty("refreshToken").GetString()!);
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private static void SetBearer(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }

    private sealed record TestCredentials(string Email, string Password);

    private sealed record AuthData(
        Guid SessionId,
        string AccessToken,
        string RefreshToken);
}
