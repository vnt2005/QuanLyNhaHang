namespace QuanLyNhaHang.Domain.Entities;

public class Notification
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string Type { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    public string Severity { get; private set; } = string.Empty;
    public string? Target { get; private set; }
    public Guid? EntityId { get; private set; }
    public bool IsRead { get; private set; }
    public DateTime? ReadAt { get; private set; }
    public DateTime CreatedAt { get; private set; }

    protected Notification()
    {
    }

    public Notification(
        Guid userId,
        string type,
        string title,
        string message,
        string severity,
        string? target,
        Guid? entityId)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("Người nhận thông báo không hợp lệ.");

        Id = Guid.NewGuid();
        UserId = userId;
        Type = Required(type, "Loại thông báo", 80);
        Title = Required(title, "Tiêu đề thông báo", 160);
        Message = Required(message, "Nội dung thông báo", 500);
        Severity = Required(severity, "Mức độ thông báo", 20);
        Target = Optional(target, 80);

        if (entityId == Guid.Empty)
            throw new ArgumentException("Dữ liệu liên quan không hợp lệ.");

        EntityId = entityId;
        IsRead = false;
        CreatedAt = DateTime.UtcNow;
    }

    public void MarkAsRead(DateTime utcNow)
    {
        if (IsRead)
            return;

        IsRead = true;
        ReadAt = utcNow.Kind == DateTimeKind.Utc
            ? utcNow
            : utcNow.ToUniversalTime();
    }

    private static string Required(
        string value,
        string fieldName,
        int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new ArgumentException($"{fieldName} không được để trống.");

        var normalized = value.Trim();

        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException(
                $"{fieldName} không được vượt quá {maximumLength} ký tự.");
        }

        return normalized;
    }

    private static string? Optional(string? value, int maximumLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Trim();

        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException(
                $"Giá trị không được vượt quá {maximumLength} ký tự.");
        }

        return normalized;
    }
}
