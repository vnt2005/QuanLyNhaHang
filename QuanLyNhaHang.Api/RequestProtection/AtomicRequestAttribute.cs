namespace QuanLyNhaHang.Api.RequestProtection;

[AttributeUsage(
    AttributeTargets.Class | AttributeTargets.Method,
    AllowMultiple = false,
    Inherited = true)]
public class AtomicRequestAttribute : Attribute
{
    public System.Data.IsolationLevel IsolationLevel { get; set; } =
        System.Data.IsolationLevel.Serializable;
}
