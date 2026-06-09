namespace QuanLyNhaHang.Domain.Entities;

public class Role
{
    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string DisplayName { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Role()
    {
    }

    public Role(
        string name,
        string displayName,
        string? description)
    {
        Id = Guid.NewGuid();

        SetName(name);
        SetDisplayName(displayName);
        SetDescription(description);

        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        string displayName,
        string? description)
    {
        SetDisplayName(displayName);
        SetDescription(description);

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

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên vai trò không được để trống.");

        Name = name.Trim();
    }

    private void SetDisplayName(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
            throw new ArgumentException("Tên hiển thị vai trò không được để trống.");

        DisplayName = displayName.Trim();
    }

    private void SetDescription(string? description)
    {
        Description = string.IsNullOrWhiteSpace(description)
            ? null
            : description.Trim();
    }
}