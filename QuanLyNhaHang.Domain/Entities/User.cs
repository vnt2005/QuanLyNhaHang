namespace QuanLyNhaHang.Domain.Entities;

public class User
{
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
        UpdatedAt = DateTime.UtcNow;
    }

    public void DisableTwoFactor()
    {
        TwoFactorEnabled = false;

        ClearTwoFactorCode();

        UpdatedAt = DateTime.UtcNow;
    }

    public void SetTwoFactorCode(string code, DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Mã xác thực 2 yếu tố không được để trống.");

        TwoFactorCode = code.Trim();
        TwoFactorCodeExpiresAt = expiresAt;

        UpdatedAt = DateTime.UtcNow;
    }

    public void ClearTwoFactorCode()
    {
        TwoFactorCode = null;
        TwoFactorCodeExpiresAt = null;

        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsTwoFactorCodeValid(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return false;

        if (string.IsNullOrWhiteSpace(TwoFactorCode))
            return false;

        if (TwoFactorCodeExpiresAt == null)
            return false;

        if (TwoFactorCodeExpiresAt < DateTime.UtcNow)
            return false;

        return TwoFactorCode == code.Trim();
    }

    public void SetPasswordResetCode(string code, DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Mã đặt lại mật khẩu không được để trống.");

        PasswordResetCode = code.Trim();
        PasswordResetCodeExpiresAt = expiresAt;

        UpdatedAt = DateTime.UtcNow;
    }

    public void ClearPasswordResetCode()
    {
        PasswordResetCode = null;
        PasswordResetCodeExpiresAt = null;

        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsPasswordResetCodeValid(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return false;

        if (string.IsNullOrWhiteSpace(PasswordResetCode))
            return false;

        if (PasswordResetCodeExpiresAt == null)
            return false;

        if (PasswordResetCodeExpiresAt < DateTime.UtcNow)
            return false;

        return PasswordResetCode == code.Trim();
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