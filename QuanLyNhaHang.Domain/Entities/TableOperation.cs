namespace QuanLyNhaHang.Domain.Entities;

public class TableOperation
{
    public Guid Id { get; private set; }

    public string OperationCode { get; private set; } = string.Empty;

    public string OperationType { get; private set; } = string.Empty;

    public Guid SourceTableId { get; private set; }

    public Guid? TargetTableId { get; private set; }

    public Guid? SourceOrderId { get; private set; }

    public Guid? TargetOrderId { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? CompletedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected TableOperation()
    {
    }

    public TableOperation(
        string operationType,
        Guid sourceTableId,
        Guid? targetTableId,
        Guid? sourceOrderId,
        Guid? targetOrderId,
        string? note)
    {
        Id = Guid.NewGuid();

        SetOperationType(operationType);
        SetSourceTableId(sourceTableId);
        SetTargetTableId(targetTableId);
        SetSourceOrderId(sourceOrderId);
        SetTargetOrderId(targetOrderId);
        SetNote(note);

        OperationCode = GenerateOperationCode();
        Status = "Completed";
        CreatedAt = DateTime.UtcNow;
        CompletedAt = DateTime.UtcNow;
    }

    public void UpdateNote(string? note)
    {
        SetNote(note);
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkCompleted()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Thao tác bàn đã hủy, không thể hoàn tất.");

        Status = "Completed";
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Thao tác bàn đã được hủy trước đó.");

        Status = "Cancelled";
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetOperationType(string operationType)
    {
        if (string.IsNullOrWhiteSpace(operationType))
            throw new ArgumentException("Loại thao tác bàn không được để trống.");

        operationType = operationType.Trim();

        var validTypes = new[] { "Transfer", "Merge", "Split" };

        if (!validTypes.Contains(operationType))
            throw new ArgumentException("Loại thao tác bàn không hợp lệ.");

        OperationType = operationType;
    }

    private void SetSourceTableId(Guid sourceTableId)
    {
        if (sourceTableId == Guid.Empty)
            throw new ArgumentException("Bàn nguồn không hợp lệ.");

        SourceTableId = sourceTableId;
    }

    private void SetTargetTableId(Guid? targetTableId)
    {
        if (targetTableId.HasValue && targetTableId.Value == Guid.Empty)
            throw new ArgumentException("Bàn đích không hợp lệ.");

        TargetTableId = targetTableId;
    }

    private void SetSourceOrderId(Guid? sourceOrderId)
    {
        if (sourceOrderId.HasValue && sourceOrderId.Value == Guid.Empty)
            throw new ArgumentException("Order nguồn không hợp lệ.");

        SourceOrderId = sourceOrderId;
    }

    private void SetTargetOrderId(Guid? targetOrderId)
    {
        if (targetOrderId.HasValue && targetOrderId.Value == Guid.Empty)
            throw new ArgumentException("Order đích không hợp lệ.");

        TargetOrderId = targetOrderId;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }

    private static string GenerateOperationCode()
    {
        return $"TBO-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }
}