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
        Assert.False(user.IsEmailVerified);
        Assert.False(user.TwoFactorEnabled);
        Assert.Equal(0, user.LoginFailedAttempts);
        Assert.Null(user.LoginLockedUntil);
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
    public void EmailVerificationCode_LocksAndIsClearedAfterFiveFailures()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(10);

        user.SetEmailVerificationCode("hashed-code", expiresAt);

        Assert.True(user.HasActiveEmailVerificationCode(now));
        Assert.False(user.HasActiveEmailVerificationCode(expiresAt));

        for (var attempt = 0; attempt < 5; attempt++)
        {
            user.RegisterEmailVerificationFailure(now);
        }

        Assert.Equal(5, user.EmailVerificationFailedAttempts);
        Assert.Equal(now.AddMinutes(15), user.EmailVerificationLockedUntil);
        Assert.True(user.IsEmailVerificationLocked(now.AddMinutes(1)));
        Assert.Null(user.EmailVerificationCode);
        Assert.Null(user.EmailVerificationCodeExpiresAt);
    }

    [Fact]
    public void MarkEmailVerified_ClearsOutstandingChallenge()
    {
        var user = CreateUser();
        user.SetEmailVerificationCode(
            "hashed-code",
            DateTime.UtcNow.AddMinutes(10));
        user.RegisterEmailVerificationFailure(DateTime.UtcNow);

        user.MarkEmailVerified();

        Assert.True(user.IsEmailVerified);
        Assert.Null(user.EmailVerificationCode);
        Assert.Null(user.EmailVerificationCodeExpiresAt);
        Assert.Equal(0, user.EmailVerificationFailedAttempts);
        Assert.Null(user.EmailVerificationLockedUntil);
    }

    [Fact]
    public void UpdateInfo_WhenEmailChanges_RequiresVerificationAgain()
    {
        var user = CreateUser();
        user.MarkEmailVerified();

        user.UpdateInfo(
            user.Ho,
            user.Ten,
            "new-address@example.com",
            user.PhoneNumber,
            user.Role);

        Assert.Equal("new-address@example.com", user.Email);
        Assert.False(user.IsEmailVerified);
    }

    [Fact]
    public void EmailVerificationCode_RejectsBlankHash()
    {
        var user = CreateUser();

        Assert.Throws<ArgumentException>(() =>
            user.SetEmailVerificationCode(
                " ",
                DateTime.UtcNow.AddMinutes(10)));
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
    public void LoginFailures_LockAccountAfterFiveAttempts()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;

        for (var attempt = 0; attempt < 5; attempt++)
        {
            user.RegisterLoginFailure(now);
        }

        Assert.Equal(5, user.LoginFailedAttempts);
        Assert.Equal(now.AddMinutes(15), user.LoginLockedUntil);
        Assert.True(user.IsLoginLocked(now.AddMinutes(1)));

        user.RegisterLoginFailure(now.AddMinutes(1));
        Assert.Equal(5, user.LoginFailedAttempts);
    }

    [Fact]
    public void LoginFailure_AfterLockExpires_StartsNewWindow()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;

        for (var attempt = 0; attempt < 5; attempt++)
        {
            user.RegisterLoginFailure(now);
        }

        var afterLock = now.AddMinutes(16);
        user.RegisterLoginFailure(afterLock);

        Assert.Equal(1, user.LoginFailedAttempts);
        Assert.Null(user.LoginLockedUntil);
        Assert.False(user.IsLoginLocked(afterLock));
    }

    [Fact]
    public void ClearLoginFailures_ResetsFailuresAndLock()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;

        for (var attempt = 0; attempt < 5; attempt++)
        {
            user.RegisterLoginFailure(now);
        }

        user.ClearLoginFailures(now.AddMinutes(1));

        Assert.Equal(0, user.LoginFailedAttempts);
        Assert.Null(user.LoginLockedUntil);
        Assert.False(user.IsLoginLocked(now.AddMinutes(1)));
    }

    [Fact]
    public void ChangePassword_ClearsPasswordResetState()
    {
        var user = CreateUser();
        var now = DateTime.UtcNow;

        user.SetPasswordResetCode(
            "hashed-reset-code",
            now.AddMinutes(10));
        user.RegisterPasswordResetFailure(now);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            user.RegisterLoginFailure(now);
        }

        user.ChangePassword("new-password-hash");

        Assert.Equal("new-password-hash", user.PasswordHash);
        Assert.Null(user.PasswordResetCode);
        Assert.Null(user.PasswordResetCodeExpiresAt);
        Assert.Equal(0, user.PasswordResetFailedAttempts);
        Assert.Null(user.PasswordResetLockedUntil);
        Assert.Equal(0, user.LoginFailedAttempts);
        Assert.Null(user.LoginLockedUntil);
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
