using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Auth;

public sealed class ChangePasswordTests
{
    [Fact]
    public async Task ChangePassword_RequiresAuthentication()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        using var response = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new
            {
                currentPassword = "OldPassword123!",
                newPassword = "NewPassword123!",
                confirmNewPassword = "NewPassword123!"
            });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_DoesNotChangePasswordOrRevokeSession()
    {
        const string email = "change-password-wrong@example.com";
        const string password = "OldPassword123!";

        using var factory = new ApiWebApplicationFactory();
        var userId = await factory.SeedUserAsync(email, password);
        using var client = factory.CreateHttpsClient();
        var login = await LoginAsync(client, email, password);
        SetBearer(client, login.AccessToken);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new
            {
                currentPassword = "WrongPassword123!",
                newPassword = "NewPassword123!",
                confirmNewPassword = "NewPassword123!"
            });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var user = await factory.GetUserAsync(userId);
        Assert.True(factory.VerifyHash(password, user.PasswordHash));
        Assert.Equal(
            HttpStatusCode.OK,
            (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithMismatchedConfirmation_ReturnsBadRequest()
    {
        const string email = "change-password-mismatch@example.com";
        const string password = "OldPassword123!";

        using var factory = new ApiWebApplicationFactory();
        await factory.SeedUserAsync(email, password);
        using var client = factory.CreateHttpsClient();
        var login = await LoginAsync(client, email, password);
        SetBearer(client, login.AccessToken);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new
            {
                currentPassword = password,
                newPassword = "NewPassword123!",
                confirmNewPassword = "DifferentPassword123!"
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithCurrentPasswordAsNew_ReturnsBadRequest()
    {
        const string email = "change-password-reused@example.com";
        const string password = "OldPassword123!";

        using var factory = new ApiWebApplicationFactory();
        await factory.SeedUserAsync(email, password);
        using var client = factory.CreateHttpsClient();
        var login = await LoginAsync(client, email, password);
        SetBearer(client, login.AccessToken);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/change-password",
            new
            {
                currentPassword = password,
                newPassword = password,
                confirmNewPassword = password
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(
            HttpStatusCode.OK,
            (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task ChangePassword_ChangesPasswordAndRevokesEveryExistingSession()
    {
        const string email = "change-password-success@example.com";
        const string oldPassword = "OldPassword123!";
        const string newPassword = "NewPassword123!";

        using var factory = new ApiWebApplicationFactory();
        var userId = await factory.SeedUserAsync(email, oldPassword);
        using var deviceA = factory.CreateHttpsClient();
        using var deviceB = factory.CreateHttpsClient();

        var loginA = await LoginAsync(deviceA, email, oldPassword);
        var loginB = await LoginAsync(deviceB, email, oldPassword);
        SetBearer(deviceA, loginA.AccessToken);
        SetBearer(deviceB, loginB.AccessToken);

        using var response = await deviceA.PostAsJsonAsync(
            "/api/auth/change-password",
            new
            {
                currentPassword = oldPassword,
                newPassword,
                confirmNewPassword = newPassword
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var user = await factory.GetUserAsync(userId);
        Assert.True(factory.VerifyHash(newPassword, user.PasswordHash));
        Assert.False(factory.VerifyHash(oldPassword, user.PasswordHash));

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await deviceA.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await deviceB.GetAsync("/api/auth/me")).StatusCode);

        using var refreshA = await deviceA.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = loginA.RefreshToken });
        using var refreshB = await deviceB.PostAsJsonAsync(
            "/api/auth/refresh",
            new { refreshToken = loginB.RefreshToken });

        Assert.Equal(HttpStatusCode.Unauthorized, refreshA.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, refreshB.StatusCode);

        using var oldLoginResponse = await deviceA.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password = oldPassword });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLoginResponse.StatusCode);

        using var newLoginResponse = await deviceA.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password = newPassword });
        Assert.Equal(HttpStatusCode.OK, newLoginResponse.StatusCode);
    }

    private static async Task<AuthData> LoginAsync(
        HttpClient client,
        string email,
        string password)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var data = json.RootElement.GetProperty("data");

        return new AuthData(
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

    private sealed record AuthData(
        string AccessToken,
        string RefreshToken);
}
