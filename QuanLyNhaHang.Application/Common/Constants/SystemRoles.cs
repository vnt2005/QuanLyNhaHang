namespace QuanLyNhaHang.Application.Common.Constants;

public static class SystemRoles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Cashier = "Cashier";
    public const string Kitchen = "Kitchen";
    public const string Staff = "Staff";
    public const string Customer = "Customer";

    public static string NormalizeEmployeeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
            throw new ArgumentException("Vai trò nhân viên không được để trống.");

        var value = role.Trim();

        if (value.Equals(Manager, StringComparison.OrdinalIgnoreCase))
            return Manager;

        if (value.Equals(Cashier, StringComparison.OrdinalIgnoreCase))
            return Cashier;

        if (value.Equals(Kitchen, StringComparison.OrdinalIgnoreCase))
            return Kitchen;

        if (value.Equals(Staff, StringComparison.OrdinalIgnoreCase))
            return Staff;

        throw new ArgumentException(
            "Tài khoản nhân viên chỉ được dùng role Manager, Cashier, Kitchen hoặc Staff.");
    }
}