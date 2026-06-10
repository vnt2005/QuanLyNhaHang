namespace QuanLyNhaHang.Domain.Entities;

public class InventoryTransaction
{
    public Guid Id { get; private set; }

    public string TransactionCode { get; private set; } = string.Empty;

    public Guid IngredientId { get; private set; }

    public string TransactionType { get; private set; } = string.Empty;

    public decimal Quantity { get; private set; }

    public decimal UnitPrice { get; private set; }

    public decimal TotalAmount { get; private set; }

    public decimal StockBefore { get; private set; }

    public decimal StockAfter { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTime TransactionDate { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? CancelledAt { get; private set; }

    protected InventoryTransaction()
    {
    }

    public InventoryTransaction(
        Guid ingredientId,
        string transactionType,
        decimal quantity,
        decimal unitPrice,
        decimal stockBefore,
        decimal stockAfter,
        string? note)
    {
        Id = Guid.NewGuid();
        TransactionCode = $"INV-{DateTime.UtcNow:yyyyMMddHHmmssfff}";

        SetIngredientId(ingredientId);
        SetTransactionType(transactionType);
        SetQuantity(quantity);
        SetUnitPrice(unitPrice);
        SetStockBefore(stockBefore);
        SetStockAfter(stockAfter);
        SetNote(note);

        TotalAmount = Quantity * UnitPrice;
        Status = "Completed";
        TransactionDate = DateTime.UtcNow;
        CreatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Giao dịch tồn kho đã được hủy trước đó.");

        Status = "Cancelled";
        CancelledAt = DateTime.UtcNow;
    }

    private void SetIngredientId(Guid ingredientId)
    {
        if (ingredientId == Guid.Empty)
            throw new ArgumentException("Nguyên liệu không hợp lệ.");

        IngredientId = ingredientId;
    }

    private void SetTransactionType(string transactionType)
    {
        if (string.IsNullOrWhiteSpace(transactionType))
            throw new ArgumentException("Loại giao dịch tồn kho không được để trống.");

        transactionType = transactionType.Trim();

        var validTypes = new[] { "Import", "Export", "Adjustment" };

        if (!validTypes.Contains(transactionType))
            throw new ArgumentException("Loại giao dịch tồn kho không hợp lệ. Chỉ được dùng Import, Export hoặc Adjustment.");

        TransactionType = transactionType;
    }

    private void SetQuantity(decimal quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng giao dịch phải lớn hơn 0.");

        Quantity = quantity;
    }

    private void SetUnitPrice(decimal unitPrice)
    {
        if (unitPrice < 0)
            throw new ArgumentException("Đơn giá không được nhỏ hơn 0.");

        UnitPrice = unitPrice;
    }

    private void SetStockBefore(decimal stockBefore)
    {
        if (stockBefore < 0)
            throw new ArgumentException("Tồn kho trước giao dịch không được nhỏ hơn 0.");

        StockBefore = stockBefore;
    }

    private void SetStockAfter(decimal stockAfter)
    {
        if (stockAfter < 0)
            throw new ArgumentException("Tồn kho sau giao dịch không được nhỏ hơn 0.");

        StockAfter = stockAfter;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}