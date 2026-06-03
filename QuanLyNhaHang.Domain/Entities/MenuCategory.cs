namespace QuanLyNhaHang.Domain.Entities;

public class MenuCategory
{
    public Guid Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public int DisplayOrder { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected MenuCategory()
    {
    }

    public MenuCategory(
        string name,
        string? description,
        int displayOrder)
    {
        Id = Guid.NewGuid();

        SetName(name);
        SetDescription(description);
        SetDisplayOrder(displayOrder);

        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        string name,
        string? description,
        int displayOrder)
    {
        SetName(name);
        SetDescription(description);
        SetDisplayOrder(displayOrder);

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
            throw new ArgumentException("Tên danh mục món ăn không được để trống.");

        Name = name.Trim();
    }

    private void SetDescription(string? description)
    {
        Description = string.IsNullOrWhiteSpace(description)
            ? null
            : description.Trim();
    }

    private void SetDisplayOrder(int displayOrder)
    {
        if (displayOrder < 0)
            throw new ArgumentException("Thứ tự hiển thị không được nhỏ hơn 0.");

        DisplayOrder = displayOrder;
    }
}