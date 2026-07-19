using QuanLyNhaHang.Domain.Entities;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Domain;

public sealed class UserTests
{
    [Fact]
    public void Constructor_NormalizesInputAndCreatesActiveUser()
    {
        var beforeCreation = DateTime.UtcNow;

        var user = new User(
            "  Nguyễn  ",
            "  An  ",
            "  AN@EXAMPLE.COM  ",
            "  0900000001  ",
            "hashed-password",
            "  Admin  ");

        Assert.NotEqual(Guid.Empty, user.Id);
        Assert.Equal("Nguyễn", user.Ho);
        Assert.Equal("An", user.Ten);
        Assert.Equal("an@example.com", user.Email);
        Assert.Equal("0900000001", user.PhoneNumber);
        Assert.Equal("Admin", user.Role);
        Assert.True(user.IsActive);
        Assert.False(user.TwoFactorEnabled);
        Assert.InRange(user.CreatedAt, beforeCreation, DateTime.UtcNow);
    }

    [Theory]
    [InlineData("ten")]
    [InlineData("email")]
    [InlineData("phone")]
    [InlineData("password")]
    [InlineData("role")]
    public void Constructor_RejectsBlankRequiredFields(string field)
    {
        Assert.Throws<ArgumentException>(() => CreateUserWithBlank(field));
    }

    [Fact]
    public void TwoFactorCode_IsActiveOnlyBeforeExpiry()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(5);

        user.SetTwoFactorCode("hashed-otp", expiresAt);

        Assert.Equal("hashed-otp", user.TwoFactorCode);
        Assert.Equal(expiresAt, user.TwoFactorCodeExpiresAt);
        Assert.True(user.HasActiveTwoFactorCode(now));
        Assert.False(user.HasActiveTwoFactorCode(expiresAt));
    }

    [Fact]
    public void TwoFactorCode_LocksAndIsClearedAfterFiveFailures()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;
        user.SetTwoFactorCode("hashed-otp", now.AddMinutes(5));

        for (var attempt = 0; attempt < 5; attempt++)
        {
            user.RegisterTwoFactorFailure(now);
        }

        Assert.Equal(5, user.TwoFactorFailedAttempts);
        Assert.Equal(now.AddMinutes(15), user.TwoFactorLockedUntil);
        Assert.True(user.IsTwoFactorLocked(now.AddMinutes(1)));
        Assert.Null(user.TwoFactorCode);
        Assert.Null(user.TwoFactorCodeExpiresAt);
        Assert.False(user.HasActiveTwoFactorCode(now));

        user.RegisterTwoFactorFailure(now.AddMinutes(1));
        Assert.Equal(5, user.TwoFactorFailedAttempts);
    }

    [Fact]
    public void ClearTwoFactorCode_ResetsCodeFailuresAndLock()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;
        user.SetTwoFactorCode("hashed-otp", now.AddMinutes(5));
        user.RegisterTwoFactorFailure(now);

        user.ClearTwoFactorCode();

        Assert.Null(user.TwoFactorCode);
        Assert.Null(user.TwoFactorCodeExpiresAt);
        Assert.Equal(0, user.TwoFactorFailedAttempts);
        Assert.Null(user.TwoFactorLockedUntil);
    }

    [Fact]
    public void EnableAndDisableTwoFactor_ClearOutstandingCodes()
    {
        var user = CreateUser();
        user.SetTwoFactorCode("hashed-otp", DateTime.UtcNow.AddMinutes(5));

        user.EnableTwoFactor();

        Assert.True(user.TwoFactorEnabled);
        Assert.Null(user.TwoFactorCode);

        user.SetTwoFactorCode("another-hash", DateTime.UtcNow.AddMinutes(5));
        user.DisableTwoFactor();

        Assert.False(user.TwoFactorEnabled);
        Assert.Null(user.TwoFactorCode);
        Assert.Equal(0, user.TwoFactorFailedAttempts);
    }

    [Fact]
    public void PasswordResetCode_LocksAndIsClearedAfterFiveFailures()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;
        user.SetPasswordResetCode("hashed-reset-code", now.AddMinutes(10));

        for (var attempt = 0; attempt < 5; attempt++)
        {
            user.RegisterPasswordResetFailure(now);
        }

        Assert.Equal(5, user.PasswordResetFailedAttempts);
        Assert.Equal(now.AddMinutes(15), user.PasswordResetLockedUntil);
        Assert.True(user.IsPasswordResetLocked(now.AddMinutes(1)));
        Assert.Null(user.PasswordResetCode);
        Assert.Null(user.PasswordResetCodeExpiresAt);
        Assert.False(user.HasActivePasswordResetCode(now));
    }

    [Fact]
    public void ChangePassword_ClearsPasswordResetState()
    {
        var user = CreateUser();
        user.SetPasswordResetCode(
            "hashed-reset-code",
            DateTime.UtcNow.AddMinutes(10));
        user.RegisterPasswordResetFailure(DateTime.UtcNow);

        user.ChangePassword("new-password-hash");

        Assert.Equal("new-password-hash", user.PasswordHash);
        Assert.Null(user.PasswordResetCode);
        Assert.Null(user.PasswordResetCodeExpiresAt);
        Assert.Equal(0, user.PasswordResetFailedAttempts);
        Assert.Null(user.PasswordResetLockedUntil);
    }

    [Fact]
    public void ActivateAndDeactivate_ChangeAccountStatus()
    {
        var user = CreateUser();

        user.Deactivate();
        Assert.False(user.IsActive);

        user.Activate();
        Assert.True(user.IsActive);
    }

    [Theory]
    [InlineData("two-factor")]
    [InlineData("password-reset")]
    public void VerificationCodeSetters_RejectBlankHashes(string codeType)
    {
        var user = CreateUser();
        var expiresAt = DateTime.UtcNow.AddMinutes(5);

        Assert.Throws<ArgumentException>(() =>
        {
            if (codeType == "two-factor")
            {
                user.SetTwoFactorCode(" ", expiresAt);
            }
            else
            {
                user.SetPasswordResetCode(" ", expiresAt);
            }
        });
    }

    private static User CreateUser()
    {
        return new User(
            "Nguyễn",
            "An",
            "an@example.com",
            "0900000001",
            "hashed-password",
            "Admin");
    }

    private static User CreateUserWithBlank(string field)
    {
        return new User(
            "Nguyễn",
            field == "ten" ? " " : "An",
            field == "email" ? " " : "an@example.com",
            field == "phone" ? " " : "0900000001",
            field == "password" ? " " : "hashed-password",
            field == "role" ? " " : "Admin");
    }
}
