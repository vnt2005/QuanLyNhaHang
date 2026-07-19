using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Auth;

public sealed class AuthEndpointsTests
{
    [Theory]
    [InlineData("/api/auth/enable-2fa")]
    [InlineData("/api/auth/disable-2fa")]
    public async Task TwoFactorManagement_RequiresAuthentication(string endpoint)
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        using var response = await client.PostAsJsonAsync(
            endpoint,
            new { password = "Password123!" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsUnauthorized()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new
            {
                email = "missing@example.com",
                password = "WrongPassword123!"
            });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        Assert.Equal(
            "Email hoặc mật khẩu không đúng.",
            json.RootElement.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Login_ThenEnableTwoFactor_UsesAuthenticatedUser()
    {
        const string email = "enable-2fa@example.com";
        const string password = "Password123!";

        using var factory = new ApiWebApplicationFactory();
        var userId = await factory.SeedUserAsync(email, password);
        using var client = factory.CreateHttpsClient();

        using var loginResponse = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        using var loginJson = await ReadJsonAsync(loginResponse);
        var loginData = loginJson.RootElement.GetProperty("data");
        var token = loginData.GetProperty("token").GetString();

        Assert.False(loginData.GetProperty("requiresTwoFactor").GetBoolean());
        Assert.False(string.IsNullOrWhiteSpace(token));

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        using var enableResponse = await client.PostAsJsonAsync(
            "/api/auth/enable-2fa",
            new { password });

        Assert.Equal(HttpStatusCode.OK, enableResponse.StatusCode);

        var user = await factory.GetUserAsync(userId);
        Assert.True(user.TwoFactorEnabled);
    }

    [Fact]
    public async Task Login_WithTwoFactor_StoresHashedOtpAndVerificationReturnsToken()
    {
        const string email = "verify-2fa@example.com";
        const string password = "Password123!";

        using var factory = new ApiWebApplicationFactory();
        var userId = await factory.SeedUserAsync(
            email,
            password,
            enableTwoFactor: true);
        using var client = factory.CreateHttpsClient();

        using var loginResponse = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        using var loginJson = await ReadJsonAsync(loginResponse);
        var loginData = loginJson.RootElement.GetProperty("data");
        Assert.True(loginData.GetProperty("requiresTwoFactor").GetBoolean());
        Assert.Equal(string.Empty, loginData.GetProperty("token").GetString());

        var emailMessage = Assert.Single(factory.EmailService.Messages);
        var otp = ExtractSixDigitCode(emailMessage.Body);
        var pendingUser = await factory.GetUserAsync(userId);

        Assert.NotNull(pendingUser.TwoFactorCode);
        Assert.NotEqual(otp, pendingUser.TwoFactorCode);
        Assert.True(factory.VerifyHash(otp, pendingUser.TwoFactorCode!));

        using var verifyResponse = await client.PostAsJsonAsync(
            "/api/auth/verify-2fa",
            new { email, code = otp });

        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);
        using var verifyJson = await ReadJsonAsync(verifyResponse);
        var token = verifyJson.RootElement
            .GetProperty("data")
            .GetProperty("token")
            .GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));

        var verifiedUser = await factory.GetUserAsync(userId);
        Assert.Null(verifiedUser.TwoFactorCode);
        Assert.Null(verifiedUser.TwoFactorCodeExpiresAt);
        Assert.Equal(0, verifiedUser.TwoFactorFailedAttempts);
    }

    [Fact]
    public async Task VerifyTwoFactor_AfterFiveWrongCodes_LocksTheChallenge()
    {
        const string email = "locked-2fa@example.com";
        const string password = "Password123!";

        using var factory = new ApiWebApplicationFactory();
        var userId = await factory.SeedUserAsync(
            email,
            password,
            enableTwoFactor: true);
        using var client = factory.CreateHttpsClient();

        using var loginResponse = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var actualOtp = ExtractSixDigitCode(
            Assert.Single(factory.EmailService.Messages).Body);
        var wrongOtp = actualOtp == "000000" ? "000001" : "000000";

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await client.PostAsJsonAsync(
                "/api/auth/verify-2fa",
                new { email, code = wrongOtp });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        var user = await factory.GetUserAsync(userId);
        Assert.Equal(5, user.TwoFactorFailedAttempts);
        Assert.NotNull(user.TwoFactorLockedUntil);
        Assert.True(user.TwoFactorLockedUntil > DateTime.UtcNow);
        Assert.Null(user.TwoFactorCode);
        Assert.Null(user.TwoFactorCodeExpiresAt);
    }

    [Fact]
    public async Task ForgotPassword_ReturnsSameMessageAndStoresOnlyHashedCode()
    {
        const string email = "forgot-password@example.com";
        const string password = "Password123!";

        using var factory = new ApiWebApplicationFactory();
        var userId = await factory.SeedUserAsync(email, password);
        using var client = factory.CreateHttpsClient();

        using var existingResponse = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new { email });
        using var missingResponse = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new { email = "missing@example.com" });

        Assert.Equal(HttpStatusCode.OK, existingResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, missingResponse.StatusCode);

        using var existingJson = await ReadJsonAsync(existingResponse);
        using var missingJson = await ReadJsonAsync(missingResponse);
        Assert.Equal(
            existingJson.RootElement.GetProperty("message").GetString(),
            missingJson.RootElement.GetProperty("message").GetString());

        var emailMessage = Assert.Single(factory.EmailService.Messages);
        var resetCode = ExtractSixDigitCode(emailMessage.Body);
        var user = await factory.GetUserAsync(userId);

        Assert.NotNull(user.PasswordResetCode);
        Assert.NotEqual(resetCode, user.PasswordResetCode);
        Assert.True(factory.VerifyHash(resetCode, user.PasswordResetCode!));
    }

    [Fact]
    public async Task ResetPassword_WithEmailedCode_ChangesPasswordAndConsumesCode()
    {
        const string email = "reset-password@example.com";
        const string oldPassword = "OldPassword123!";
        const string newPassword = "NewPassword123!";

        using var factory = new ApiWebApplicationFactory();
        var userId = await factory.SeedUserAsync(email, oldPassword);
        using var client = factory.CreateHttpsClient();

        using var forgotResponse = await client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new { email });
        Assert.Equal(HttpStatusCode.OK, forgotResponse.StatusCode);

        var resetCode = ExtractSixDigitCode(
            Assert.Single(factory.EmailService.Messages).Body);

        using var resetResponse = await client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new
            {
                email,
                code = resetCode,
                newPassword
            });

        Assert.Equal(HttpStatusCode.OK, resetResponse.StatusCode);

        var user = await factory.GetUserAsync(userId);
        Assert.True(factory.VerifyHash(newPassword, user.PasswordHash));
        Assert.Null(user.PasswordResetCode);
        Assert.Null(user.PasswordResetCodeExpiresAt);

        using var loginResponse = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password = newPassword });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private static string ExtractSixDigitCode(string content)
    {
        var match = Regex.Match(content, @"\b\d{6}\b");
        Assert.True(match.Success, "Email did not contain a six-digit code.");
        return match.Value;
    }
}
