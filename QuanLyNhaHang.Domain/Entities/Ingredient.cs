namespace QuanLyNhaHang.Domain.Entities;

public class Ingredient
{
    public Guid Id { get; private set; }

    public Guid IngredientCategoryId { get; private set; }

    public string IngredientCode { get; private set; } = string.Empty;

    public string Name { get; private set; } = string.Empty;

    public string Unit { get; private set; } = string.Empty;

    public decimal CurrentStock { get; private set; }

    public decimal MinimumStock { get; private set; }

    public decimal CostPrice { get; private set; }

    public string? Note { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Ingredient()
    {
    }

    public Ingredient(
        Guid ingredientCategoryId,
        string ingredientCode,
        string name,
        string unit,
        decimal currentStock,
        decimal minimumStock,
        decimal costPrice,
        string? note)
    {
        Id = Guid.NewGuid();

        SetIngredientCategoryId(ingredientCategoryId);
        SetIngredientCode(ingredientCode);
        SetName(name);
        SetUnit(unit);
        SetCurrentStock(currentStock);
        SetMinimumStock(minimumStock);
        SetCostPrice(costPrice);
        SetNote(note);

        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        Guid ingredientCategoryId,
        string name,
        string unit,
        decimal minimumStock,
        decimal costPrice,
        string? note)
    {
        SetIngredientCategoryId(ingredientCategoryId);
        SetName(name);
        SetUnit(unit);
        SetMinimumStock(minimumStock);
        SetCostPrice(costPrice);
        SetNote(note);

        UpdatedAt = DateTime.UtcNow;
    }

    public void ImportStock(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng nhập kho phải lớn hơn 0.");

        CurrentStock += quantity;
        UpdatedAt = DateTime.UtcNow;
    }

    public void ExportStock(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng xuất kho phải lớn hơn 0.");

        if (quantity > CurrentStock)
            throw new InvalidOperationException("Số lượng xuất kho không được lớn hơn tồn kho hiện tại.");

        CurrentStock -= quantity;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AdjustStock(decimal newStock)
    {
        if (newStock < 0)
            throw new ArgumentException("Tồn kho mới không được nhỏ hơn 0.");

        CurrentStock = newStock;
        UpdatedAt = DateTime.UtcNow;
    }

    public bool IsLowStock()
    {
        return CurrentStock <= MinimumStock;
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

    private void SetIngredientCategoryId(Guid ingredientCategoryId)
    {
        if (ingredientCategoryId == Guid.Empty)
            throw new ArgumentException("Danh mục nguyên liệu không hợp lệ.");

        IngredientCategoryId = ingredientCategoryId;
    }

    private void SetIngredientCode(string ingredientCode)
    {
        if (string.IsNullOrWhiteSpace(ingredientCode))
            throw new ArgumentException("Mã nguyên liệu không được để trống.");

        IngredientCode = ingredientCode.Trim().ToUpper();
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên nguyên liệu không được để trống.");

        Name = name.Trim();
    }

    private void SetUnit(string unit)
    {
        if (string.IsNullOrWhiteSpace(unit))
            throw new ArgumentException("Đơn vị tính không được để trống.");

        Unit = unit.Trim();
    }

    private void SetCurrentStock(decimal currentStock)
    {
        if (currentStock < 0)
            throw new ArgumentException("Tồn kho hiện tại không được nhỏ hơn 0.");

        CurrentStock = currentStock;
    }

    private void SetMinimumStock(decimal minimumStock)
    {
        if (minimumStock < 0)
            throw new ArgumentException("Tồn kho tối thiểu không được nhỏ hơn 0.");

        MinimumStock = minimumStock;
    }

    private void SetCostPrice(decimal costPrice)
    {
        if (costPrice < 0)
            throw new ArgumentException("Giá vốn nguyên liệu không được nhỏ hơn 0.");

        CostPrice = costPrice;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}