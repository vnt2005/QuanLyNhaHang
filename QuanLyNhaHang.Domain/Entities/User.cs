namespace QuanLyNhaHang.Domain.Entities;

public class User
{
    public Guid Id { get; private set; }

    public string FullName { get; private set; } = string.Empty;

    public string Email { get; private set; } = string.Empty;

    public string PhoneNumber { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    public string Role { get; private set; } = string.Empty;

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected User()
    {
    }

    public User(
        string fullName,
        string email,
        string phoneNumber,
        string passwordHash,
        string role)
    {
        Id = Guid.NewGuid();

        SetFullName(fullName);
        SetEmail(email);
        SetPhoneNumber(phoneNumber);
        SetPasswordHash(passwordHash);
        SetRole(role);

        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        string fullName,
        string email,
        string phoneNumber,
        string role)
    {
        SetFullName(fullName);
        SetEmail(email);
        SetPhoneNumber(phoneNumber);
        SetRole(role);

        UpdatedAt = DateTime.UtcNow;
    }

    public void ChangePassword(string newPasswordHash)
    {
        SetPasswordHash(newPasswordHash);
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

    private void SetFullName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            throw new ArgumentException("Họ tên người dùng không được để trống.");

        FullName = fullName.Trim();
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