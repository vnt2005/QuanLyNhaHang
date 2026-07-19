namespace QuanLyNhaHang.Domain.Entities;

public class User
{
    private const int MaxVerificationFailures = 5;

    private static readonly TimeSpan VerificationLockDuration =
        TimeSpan.FromMinutes(15);
    public Guid Id { get; private set; }

    public string? Ho { get; private set; }

    public string Ten { get; private set; } = default!;

    public string Email { get; private set; } = string.Empty;

    public string PhoneNumber { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    public string Role { get; private set; } = string.Empty;

    public bool IsActive { get; private set; }

    public bool TwoFactorEnabled { get; private set; }

    public string? TwoFactorCode { get; private set; }

    public DateTime? TwoFactorCodeExpiresAt { get; private set; }

    public string? PasswordResetCode { get; private set; }

    public DateTime? PasswordResetCodeExpiresAt { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    public int TwoFactorFailedAttempts { get; private set; }

    public DateTime? TwoFactorLockedUntil { get; private set; }

    public int PasswordResetFailedAttempts { get; private set; }

    public DateTime? PasswordResetLockedUntil { get; private set; }
    protected User()
    {
    }

    public User(
        string? ho,
        string ten,
        string email,
        string phoneNumber,
        string passwordHash,
        string role)
    {
        Id = Guid.NewGuid();

        SetHo(ho);
        SetTen(ten);
        SetEmail(email);
        SetPhoneNumber(phoneNumber);
        SetPasswordHash(passwordHash);
        SetRole(role);

        IsActive = true;
        TwoFactorEnabled = false;
        CreatedAt = DateTime.UtcNow;
        TwoFactorFailedAttempts = 0;
        PasswordResetFailedAttempts = 0;
    }

    public void UpdateInfo(
        string? ho,
        string ten,
        string email,
        string phoneNumber,
        string role)
    {
        SetHo(ho);
        SetTen(ten);
        SetEmail(email);
        SetPhoneNumber(phoneNumber);
        SetRole(role);

        UpdatedAt = DateTime.UtcNow;
    }

    public void ChangePassword(string newPasswordHash)
    {
        SetPasswordHash(newPasswordHash);

        ClearPasswordResetCode();

        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    public void EnableTwoFactor()
    {
        TwoFactorEnabled = true;
        ClearTwoFactorCode();
        UpdatedAt = DateTime.UtcNow;
    }

    public void DisableTwoFactor()
    {
        TwoFactorEnabled = false;

        ClearTwoFactorCode();

        UpdatedAt = DateTime.UtcNow;
    }

    public void SetTwoFactorCode(
    string codeHash,
    DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(codeHash))
        {
            throw new ArgumentException(
                "Mã xác thực 2 yếu tố không hợp lệ.");
        }

        TwoFactorCode = codeHash;
        TwoFactorCodeExpiresAt = expiresAt;
        TwoFactorFailedAttempts = 0;
        TwoFactorLockedUntil = null;
        UpdatedAt = DateTime.UtcNow;
    }
    public bool HasActiveTwoFactorCode(DateTime utcNow)
    {
        return !IsTwoFactorLocked(utcNow) &&
               !string.IsNullOrWhiteSpace(TwoFactorCode) &&
               TwoFactorCodeExpiresAt.HasValue &&
               TwoFactorCodeExpiresAt.Value > utcNow;
    }
    public bool IsTwoFactorLocked(DateTime utcNow)
    {
        return TwoFactorLockedUntil.HasValue &&
               TwoFactorLockedUntil.Value > utcNow;
    }
    public void RegisterTwoFactorFailure(DateTime utcNow)
    {
        if (IsTwoFactorLocked(utcNow))
            return;

        TwoFactorFailedAttempts++;

        if (TwoFactorFailedAttempts >= MaxVerificationFailures)
        {
            TwoFactorLockedUntil =
                utcNow.Add(VerificationLockDuration);

            TwoFactorCode = null;
            TwoFactorCodeExpiresAt = null;
        }

        UpdatedAt = utcNow;
    }

    public void ClearTwoFactorCode()
    {
        TwoFactorCode = null;
        TwoFactorCodeExpiresAt = null;
        TwoFactorFailedAttempts = 0;
        TwoFactorLockedUntil = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetPasswordResetCode(
    string codeHash,
    DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(codeHash))
        {
            throw new ArgumentException(
                "Mã đặt lại mật khẩu không hợp lệ.");
        }

        PasswordResetCode = codeHash;
        PasswordResetCodeExpiresAt = expiresAt;
        PasswordResetFailedAttempts = 0;
        PasswordResetLockedUntil = null;
        UpdatedAt = DateTime.UtcNow;
    }
    public bool HasActivePasswordResetCode(DateTime utcNow)
    {
        return !IsPasswordResetLocked(utcNow) &&
               !string.IsNullOrWhiteSpace(PasswordResetCode) &&
               PasswordResetCodeExpiresAt.HasValue &&
               PasswordResetCodeExpiresAt.Value > utcNow;
    }

    public bool IsPasswordResetLocked(DateTime utcNow)
    {
        return PasswordResetLockedUntil.HasValue &&
               PasswordResetLockedUntil.Value > utcNow;
    }
    public void RegisterPasswordResetFailure(DateTime utcNow)
    {
        if (IsPasswordResetLocked(utcNow))
            return;

        PasswordResetFailedAttempts++;

        if (PasswordResetFailedAttempts >= MaxVerificationFailures)
        {
            PasswordResetLockedUntil =
                utcNow.Add(VerificationLockDuration);

            PasswordResetCode = null;
            PasswordResetCodeExpiresAt = null;
        }

        UpdatedAt = utcNow;
    }

    public void ClearPasswordResetCode()
    {
        PasswordResetCode = null;
        PasswordResetCodeExpiresAt = null;
        PasswordResetFailedAttempts = 0;
        PasswordResetLockedUntil = null;
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetHo(string? ho)
    {
        Ho = string.IsNullOrWhiteSpace(ho) ? null : ho.Trim();
    }

    private void SetTen(string ten)
    {
        if (string.IsNullOrWhiteSpace(ten))
            throw new ArgumentException("Tên người dùng không được để trống.");

        Ten = ten.Trim();
    }

    private void SetEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email không được để trống.");

        Email = email.Trim().ToLower();
    }

    private void SetPhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentException("Số điện thoại không được để trống.");

        PhoneNumber = phoneNumber.Trim();
    }

    private void SetPasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
            throw new ArgumentException("Mật khẩu không được để trống.");

        PasswordHash = passwordHash;
    }

    private void SetRole(string role)
    {
        if (string.IsNullOrWhiteSpace(role))
            throw new ArgumentException("Vai trò người dùng không được để trống.");

        Role = role.Trim();
    }
}