namespace QuanLyNhaHang.Domain.Entities;

public class MenuItem
{
    public Guid Id { get; private set; }

    public Guid MenuCategoryId { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string? Description { get; private set; }

    public decimal Price { get; private set; }

    public string? ImageUrl { get; private set; }

    public bool IsAvailable { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected MenuItem()
    {
    }

    public MenuItem(
        Guid menuCategoryId,
        string name,
        string? description,
        decimal price,
        string? imageUrl)
    {
        Id = Guid.NewGuid();

        SetMenuCategoryId(menuCategoryId);
        SetName(name);
        SetDescription(description);
        SetPrice(price);
        SetImageUrl(imageUrl);

        IsAvailable = true;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        Guid menuCategoryId,
        string name,
        string? description,
        decimal price,
        string? imageUrl)
    {
        SetMenuCategoryId(menuCategoryId);
        SetName(name);
        SetDescription(description);
        SetPrice(price);
        SetImageUrl(imageUrl);

        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAvailable()
    {
        IsAvailable = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkUnavailable()
    {
        IsAvailable = false;
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

    private void SetMenuCategoryId(Guid menuCategoryId)
    {
        if (menuCategoryId == Guid.Empty)
            throw new ArgumentException("Danh mục món ăn không hợp lệ.");

        MenuCategoryId = menuCategoryId;
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên món ăn không được để trống.");

        Name = name.Trim();
    }

    private void SetDescription(string? description)
    {
        Description = string.IsNullOrWhiteSpace(description)
            ? null
            : description.Trim();
    }

    private void SetPrice(decimal price)
    {
        if (price < 0)
            throw new ArgumentException("Giá món ăn không được nhỏ hơn 0.");

        Price = price;
    }

    private void SetImageUrl(string? imageUrl)
    {
        ImageUrl = string.IsNullOrWhiteSpace(imageUrl)
            ? null
            : imageUrl.Trim();
    }
}