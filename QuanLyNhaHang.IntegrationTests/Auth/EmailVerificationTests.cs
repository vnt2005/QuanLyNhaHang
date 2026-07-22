using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Auth;

public sealed class EmailVerificationTests
{
    [Fact]
    public async Task Register_VerifyEmail_ThenLoginReturnsSessionTokens()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"verify-email-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";

        using var registerResponse = await client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                ho = "Email",
                ten = "Tester",
                email,
                phoneNumber = $"08{Random.Shared.Next(10000000, 99999999)}",
                password
            });

        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        using var registerJson = await ReadJsonAsync(registerResponse);
        var registerData = registerJson.RootElement.GetProperty("data");
        var userId = registerData.GetProperty("userId").GetGuid();

        Assert.Equal(
            JsonValueKind.Null,
            registerData.GetProperty("sessionId").ValueKind);
        Assert.Equal(
            string.Empty,
            registerData.GetProperty("token").GetString());
        Assert.Equal(
            string.Empty,
            registerData.GetProperty("refreshToken").GetString());
        Assert.False(
            registerData.GetProperty("isEmailVerified").GetBoolean());
        Assert.True(
            registerData.GetProperty("requiresEmailVerification").GetBoolean());

        var sentEmail = Assert.Single(factory.EmailService.Messages);
        var verificationCode = ExtractSixDigitCode(sentEmail.Body);
        var pendingUser = await factory.GetUserAsync(userId);

        Assert.NotNull(pendingUser.EmailVerificationCode);
        Assert.NotEqual(
            verificationCode,
            pendingUser.EmailVerificationCode);
        Assert.True(factory.VerifyHash(
            verificationCode,
            pendingUser.EmailVerificationCode!));

        using var blockedLoginResponse = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            blockedLoginResponse.StatusCode);

        using var blockedLoginJson =
            await ReadJsonAsync(blockedLoginResponse);
        Assert.Equal(
            "Email chưa được xác minh. " +
            "Vui lòng kiểm tra email hoặc yêu cầu gửi mã mới.",
            blockedLoginJson.RootElement
                .GetProperty("message")
                .GetString());

        using var verifyResponse = await client.PostAsJsonAsync(
            "/api/auth/verify-email",
            new { email, code = verificationCode });

        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

        var verifiedUser = await factory.GetUserAsync(userId);
        Assert.True(verifiedUser.IsEmailVerified);
        Assert.Null(verifiedUser.EmailVerificationCode);
        Assert.Null(verifiedUser.EmailVerificationCodeExpiresAt);
        Assert.Equal(0, verifiedUser.EmailVerificationFailedAttempts);
        Assert.Null(verifiedUser.EmailVerificationLockedUntil);

        using var loginResponse = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });

        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        using var loginJson = await ReadJsonAsync(loginResponse);
        var loginData = loginJson.RootElement.GetProperty("data");

        Assert.False(string.IsNullOrWhiteSpace(
            loginData.GetProperty("token").GetString()));
        Assert.False(string.IsNullOrWhiteSpace(
            loginData.GetProperty("refreshToken").GetString()));
        Assert.True(
            loginData.GetProperty("isEmailVerified").GetBoolean());
        Assert.False(
            loginData.GetProperty("requiresEmailVerification").GetBoolean());
    }

    [Fact]
    public async Task VerifyEmail_AfterFiveWrongCodes_LocksChallenge()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"locked-verification-{suffix}@example.com";

        using var registerResponse = await client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                ho = "Locked",
                ten = "Tester",
                email,
                phoneNumber = $"08{Random.Shared.Next(10000000, 99999999)}",
                password = $"Test-{suffix[..12]}!Aa1"
            });

        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        using var registerJson = await ReadJsonAsync(registerResponse);
        var userId = registerJson.RootElement
            .GetProperty("data")
            .GetProperty("userId")
            .GetGuid();

        var actualCode = ExtractSixDigitCode(
            Assert.Single(factory.EmailService.Messages).Body);
        var wrongCode = actualCode == "000000" ? "000001" : "000000";

        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var response = await client.PostAsJsonAsync(
                "/api/auth/verify-email",
                new { email, code = wrongCode });

            Assert.Equal(
                HttpStatusCode.Unauthorized,
                response.StatusCode);
        }

        var user = await factory.GetUserAsync(userId);

        Assert.False(user.IsEmailVerified);
        Assert.Equal(5, user.EmailVerificationFailedAttempts);
        Assert.NotNull(user.EmailVerificationLockedUntil);
        Assert.True(
            user.EmailVerificationLockedUntil > DateTime.UtcNow);
        Assert.Null(user.EmailVerificationCode);
        Assert.Null(user.EmailVerificationCodeExpiresAt);
    }

    [Fact]
    public async Task ResendVerificationEmail_UsesGenericResponseAndRotatesCode()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"resend-verification-{suffix}@example.com";

        using var registerResponse = await client.PostAsJsonAsync(
            "/api/auth/register",
            new
            {
                ho = "Resend",
                ten = "Tester",
                email,
                phoneNumber = $"08{Random.Shared.Next(10000000, 99999999)}",
                password = $"Test-{suffix[..12]}!Aa1"
            });

        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        using var registerJson = await ReadJsonAsync(registerResponse);
        var userId = registerJson.RootElement
            .GetProperty("data")
            .GetProperty("userId")
            .GetGuid();

        using var existingResponse = await client.PostAsJsonAsync(
            "/api/auth/resend-verification-email",
            new { email });
        using var missingResponse = await client.PostAsJsonAsync(
            "/api/auth/resend-verification-email",
            new { email = $"missing-{suffix}@example.com" });

        Assert.Equal(HttpStatusCode.OK, existingResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, missingResponse.StatusCode);

        using var existingJson = await ReadJsonAsync(existingResponse);
        using var missingJson = await ReadJsonAsync(missingResponse);
        Assert.Equal(
            existingJson.RootElement.GetProperty("message").GetString(),
            missingJson.RootElement.GetProperty("message").GetString());

        Assert.Equal(2, factory.EmailService.Messages.Count);
        var newestCode = ExtractSixDigitCode(
            factory.EmailService.Messages[^1].Body);
        var user = await factory.GetUserAsync(userId);

        Assert.NotNull(user.EmailVerificationCode);
        Assert.True(factory.VerifyHash(
            newestCode,
            user.EmailVerificationCode!));
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
        Assert.True(
            match.Success,
            "Email did not contain a six-digit code.");
        return match.Value;
    }
}
