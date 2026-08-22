namespace QuanLyNhaHang.Domain.Entities;

public sealed class IdempotencyRecord
{
    public Guid Id { get; private set; }

    public string Scope { get; private set; } = string.Empty;

    public string Actor { get; private set; } = string.Empty;

    public string Key { get; private set; } = string.Empty;

    public string RequestHash { get; private set; } = string.Empty;

    public int? StatusCode { get; private set; }

    public string? ContentType { get; private set; }

    public string? ResponseBody { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime ExpiresAt { get; private set; }

    public bool IsCompleted => StatusCode.HasValue;

    protected IdempotencyRecord()
    {
    }

    public IdempotencyRecord(
        string scope,
        string actor,
        string key,
        string requestHash,
        DateTime expiresAt)
    {
        if (string.IsNullOrWhiteSpace(scope))
            throw new ArgumentException("Phạm vi idempotency không được để trống.", nameof(scope));

        if (string.IsNullOrWhiteSpace(actor))
            throw new ArgumentException("Chủ thể idempotency không được để trống.", nameof(actor));

        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Idempotency key không được để trống.", nameof(key));

        if (string.IsNullOrWhiteSpace(requestHash))
            throw new ArgumentException("Dấu vân tay request không được để trống.", nameof(requestHash));

        var now = DateTime.UtcNow;
        if (expiresAt <= now)
            throw new ArgumentException("Thời hạn idempotency phải nằm trong tương lai.", nameof(expiresAt));

        Id = Guid.NewGuid();
        Scope = scope.Trim();
        Actor = actor.Trim();
        Key = key.Trim();
        RequestHash = requestHash.Trim();
        CreatedAt = now;
        ExpiresAt = expiresAt;
    }

    public void Complete(
        int statusCode,
        string? contentType,
        string responseBody)
    {
        if (statusCode is < 200 or >= 400)
            throw new ArgumentOutOfRangeException(
                nameof(statusCode),
                "Chỉ phản hồi thành công mới được lưu để phát lại.");

        StatusCode = statusCode;
        ContentType = string.IsNullOrWhiteSpace(contentType)
            ? "application/json; charset=utf-8"
            : contentType.Trim();
        ResponseBody = responseBody;
    }
}

