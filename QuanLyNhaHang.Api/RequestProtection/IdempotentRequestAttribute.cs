namespace QuanLyNhaHang.Api.RequestProtection;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class IdempotentRequestAttribute : AtomicRequestAttribute
{
    public IdempotentRequestAttribute(string scope)
    {
        if (string.IsNullOrWhiteSpace(scope))
            throw new ArgumentException("Phạm vi idempotency không được để trống.", nameof(scope));

        Scope = scope.Trim();
    }

    public string Scope { get; }

    public bool RequireKey { get; set; }

    public int LifetimeMinutes { get; set; } = 24 * 60;

    public int FallbackWindowSeconds { get; set; } = 10;
}
