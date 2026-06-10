namespace QuanLyNhaHang.Domain.Entities;

public class ActivityLog
{
    public Guid Id { get; private set; }

    public Guid? UserId { get; private set; }

    public string? UserName { get; private set; }

    public string Action { get; private set; } = string.Empty;

    public string ModuleName { get; private set; } = string.Empty;

    public string? EntityName { get; private set; }

    public Guid? EntityId { get; private set; }

    public string Description { get; private set; } = string.Empty;

    public string? OldValues { get; private set; }

    public string? NewValues { get; private set; }

    public string? IpAddress { get; private set; }

    public string? UserAgent { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public DateTime CreatedAt { get; private set; }

    protected ActivityLog()
    {
    }

    public ActivityLog(
        Guid? userId,
        string? userName,
        string action,
        string moduleName,
        string? entityName,
        Guid? entityId,
        string description,
        string? oldValues,
        string? newValues,
        string? ipAddress,
        string? userAgent,
        string status)
    {
        Id = Guid.NewGuid();

        SetUserId(userId);
        SetUserName(userName);
        SetAction(action);
        SetModuleName(moduleName);
        SetEntityName(entityName);
        SetEntityId(entityId);
        SetDescription(description);
        SetOldValues(oldValues);
        SetNewValues(newValues);
        SetIpAddress(ipAddress);
        SetUserAgent(userAgent);
        SetStatus(status);

        CreatedAt = DateTime.UtcNow;
    }

    private void SetUserId(Guid? userId)
    {
        if (userId.HasValue && userId.Value == Guid.Empty)
            throw new ArgumentException("Người dùng không hợp lệ.");

        UserId = userId;
    }

    private void SetUserName(string? userName)
    {
        UserName = string.IsNullOrWhiteSpace(userName)
            ? null
            : userName.Trim();
    }

    private void SetAction(string action)
    {
        if (string.IsNullOrWhiteSpace(action))
            throw new ArgumentException("Hành động không được để trống.");

        Action = action.Trim();
    }

    private void SetModuleName(string moduleName)
    {
        if (string.IsNullOrWhiteSpace(moduleName))
            throw new ArgumentException("Tên module không được để trống.");

        ModuleName = moduleName.Trim();
    }

    private void SetEntityName(string? entityName)
    {
        EntityName = string.IsNullOrWhiteSpace(entityName)
            ? null
            : entityName.Trim();
    }

    private void SetEntityId(Guid? entityId)
    {
        if (entityId.HasValue && entityId.Value == Guid.Empty)
            throw new ArgumentException("Id dữ liệu không hợp lệ.");

        EntityId = entityId;
    }

    private void SetDescription(string description)
    {
        if (string.IsNullOrWhiteSpace(description))
            throw new ArgumentException("Mô tả hoạt động không được để trống.");

        Description = description.Trim();
    }

    private void SetOldValues(string? oldValues)
    {
        OldValues = string.IsNullOrWhiteSpace(oldValues)
            ? null
            : oldValues.Trim();
    }

    private void SetNewValues(string? newValues)
    {
        NewValues = string.IsNullOrWhiteSpace(newValues)
            ? null
            : newValues.Trim();
    }

    private void SetIpAddress(string? ipAddress)
    {
        IpAddress = string.IsNullOrWhiteSpace(ipAddress)
            ? null
            : ipAddress.Trim();
    }

    private void SetUserAgent(string? userAgent)
    {
        UserAgent = string.IsNullOrWhiteSpace(userAgent)
            ? null
            : userAgent.Trim();
    }

    private void SetStatus(string status)
    {
        if (string.IsNullOrWhiteSpace(status))
            throw new ArgumentException("Trạng thái nhật ký không được để trống.");

        status = status.Trim();

        var validStatuses = new[] { "Success", "Failed" };

        if (!validStatuses.Contains(status))
            throw new ArgumentException("Trạng thái nhật ký không hợp lệ. Chỉ được dùng Success hoặc Failed.");

        Status = status;
    }
}