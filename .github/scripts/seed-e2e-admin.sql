SET NOCOUNT ON;

DECLARE @AdminEmail nvarchar(256) = LOWER(N'$(AdminEmail)');

UPDATE [Users]
SET
    [Role] = N'Admin',
    [IsActive] = 1,
    [IsEmailVerified] = 1,
    [EmailVerificationCode] = NULL,
    [EmailVerificationCodeExpiresAt] = NULL,
    [EmailVerificationFailedAttempts] = 0,
    [EmailVerificationLockedUntil] = NULL,
    [TwoFactorEnabled] = 0,
    [TwoFactorCode] = NULL,
    [TwoFactorCodeExpiresAt] = NULL,
    [TwoFactorFailedAttempts] = 0,
    [TwoFactorLockedUntil] = NULL,
    [LoginFailedAttempts] = 0,
    [LoginLockedUntil] = NULL,
    [UpdatedAt] = SYSUTCDATETIME()
WHERE [Email] = @AdminEmail;

IF @@ROWCOUNT <> 1
BEGIN
    THROW 51000, 'Không tìm thấy đúng một tài khoản E2E để nâng thành Admin.', 1;
END;
