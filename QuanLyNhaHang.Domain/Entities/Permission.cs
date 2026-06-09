namespace QuanLyNhaHang.Domain.Entities;

public class Permission
{
    public Guid Id { get; private set; }

    public string Code { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    public string GroupName { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Permission()
    {
    }

    public Permission(
        string code,
        string name,
        string groupName,
        string? description)
    {
        Id = Guid.NewGuid();

        SetCode(code);
        SetName(name);
        SetGroupName(groupName);
        SetDescription(description);

        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        string name,
        string groupName,
        string? description)
    {
        SetName(name);
        SetGroupName(groupName);
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

    private void SetCode(string code)
    {
        if (string.IsNullOrWhiteSpace(code))
            throw new ArgumentException("Mã quyền không được để trống.");

        Code = code.Trim();
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên quyền không được để trống.");

        Name = name.Trim();
    }

    private void SetGroupName(string groupName)
    {
        if (string.IsNullOrWhiteSpace(groupName))
            throw new ArgumentException("Nhóm quyền không được để trống.");

        GroupName = groupName.Trim();
    }

    private void SetDescription(string? description)
    {
        Description = string.IsNullOrWhiteSpace(description)
            ? null
            : description.Trim();
    }
}