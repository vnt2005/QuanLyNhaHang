using System.Text.Json;
using QuanLyNhaHang.Application.Common.Behaviors;
using QuanLyNhaHang.Application.Common.Interfaces;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class ActivityLogBehaviorTests
{
    [Fact]
    public async Task Handle_RedactsAuthenticationCodesAndSecrets()
    {
        var request = new AuthenticationCodesCommand
        {
            Code = "123456",
            CodeHash = "hash-123456",
            EmailVerificationCode = "654321",
            AuthenticationCode = "auth-123",
            AuthorizationCode = "oauth-123",
            ConfirmationCode = "confirm-123",
            PasswordResetCode = "reset-123",
            RecoveryCode = "recover-123",
            SecurityCode = "security-123",
            ChallengeCode = "challenge-123",
            Password = "password-123",
            RefreshToken = "token-123"
        };

        var newValues = await HandleAsync(request);

        using var document = JsonDocument.Parse(newValues);
        var root = document.RootElement;

        AssertRedacted(root, nameof(AuthenticationCodesCommand.Code));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.CodeHash));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.EmailVerificationCode));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.AuthenticationCode));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.AuthorizationCode));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.ConfirmationCode));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.PasswordResetCode));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.RecoveryCode));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.SecurityCode));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.ChallengeCode));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.Password));
        AssertRedacted(root, nameof(AuthenticationCodesCommand.RefreshToken));

        Assert.DoesNotContain(request.Code, newValues);
        Assert.DoesNotContain(request.EmailVerificationCode, newValues);
        Assert.DoesNotContain(request.RecoveryCode, newValues);
    }

    [Fact]
    public async Task Handle_PreservesBusinessCodes()
    {
        var request = new BusinessCodesCommand
        {
            EmployeeCode = "EMP-001",
            PromotionCode = "PROMO-20",
            TableQrCode = "TABLE-QR-01"
        };

        var newValues = await HandleAsync(request);

        using var document = JsonDocument.Parse(newValues);
        var root = document.RootElement;

        Assert.Equal(
            request.EmployeeCode,
            root.GetProperty(nameof(BusinessCodesCommand.EmployeeCode)).GetString());
        Assert.Equal(
            request.PromotionCode,
            root.GetProperty(nameof(BusinessCodesCommand.PromotionCode)).GetString());
        Assert.Equal(
            request.TableQrCode,
            root.GetProperty(nameof(BusinessCodesCommand.TableQrCode)).GetString());
    }

    private static async Task<string> HandleAsync<TRequest>(TRequest request)
        where TRequest : notnull
    {
        var activityLogService = new RecordingActivityLogService();
        var behavior = new ActivityLogBehavior<TRequest, string>(
            activityLogService,
            new TestCurrentUserService());

        var response = await behavior.Handle(
            request,
            _ => Task.FromResult("handled"),
            CancellationToken.None);

        Assert.Equal("handled", response);

        return Assert.IsType<string>(activityLogService.NewValues);
    }

    private static void AssertRedacted(JsonElement root, string propertyName)
    {
        Assert.Equal("***", root.GetProperty(propertyName).GetString());
    }

    private sealed class AuthenticationCodesCommand
    {
        public string Code { get; init; } = string.Empty;

        public string CodeHash { get; init; } = string.Empty;

        public string EmailVerificationCode { get; init; } = string.Empty;

        public string AuthenticationCode { get; init; } = string.Empty;

        public string AuthorizationCode { get; init; } = string.Empty;

        public string ConfirmationCode { get; init; } = string.Empty;

        public string PasswordResetCode { get; init; } = string.Empty;

        public string RecoveryCode { get; init; } = string.Empty;

        public string SecurityCode { get; init; } = string.Empty;

        public string ChallengeCode { get; init; } = string.Empty;

        public string Password { get; init; } = string.Empty;

        public string RefreshToken { get; init; } = string.Empty;
    }

    private sealed class BusinessCodesCommand
    {
        public string EmployeeCode { get; init; } = string.Empty;

        public string PromotionCode { get; init; } = string.Empty;

        public string TableQrCode { get; init; } = string.Empty;
    }

    private sealed class RecordingActivityLogService : IActivityLogService
    {
        public string? NewValues { get; private set; }

        public Task LogAsync(
            Guid? userId,
            string? userName,
            string action,
            string moduleName,
            string? entityName,
            Guid? entityId,
            string description,
            string? oldValues,
            string? newValues,
            string? ipAddress,
            string? userAgent,
            string status,
            CancellationToken cancellationToken = default)
        {
            NewValues = newValues;

            return Task.CompletedTask;
        }
    }

    private sealed class TestCurrentUserService : ICurrentUserService
    {
        public Guid? UserId => null;

        public Guid? SessionId => null;

        public string? UserName => "UnitTests";

        public string? IpAddress => "127.0.0.1";

        public string? UserAgent => "UnitTests";
    }
}
