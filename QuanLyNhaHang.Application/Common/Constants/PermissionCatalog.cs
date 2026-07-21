using System.Reflection;

namespace QuanLyNhaHang.Application.Common.Constants;

public sealed record PermissionDefinition(
    string Code,
    string Name,
    string GroupName,
    string Description);

public static class PermissionCatalog
{
    private static readonly IReadOnlyDictionary<string, string> GroupLabels =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Kitchen"] = "Bếp",
            ["Payments"] = "Thanh toán",
            ["Invoices"] = "Hóa đơn",
            ["Orders"] = "Đơn hàng",
            ["Inventory"] = "Kho",
            ["Reservations"] = "Đặt bàn",
            ["Menu"] = "Thực đơn",
            ["Tables"] = "Bàn",
            ["Employees"] = "Nhân viên",
            ["Users"] = "Người dùng",
            ["Roles"] = "Vai trò",
            ["Permissions"] = "Quyền",
            ["RolePermissions"] = "Phân quyền vai trò",
            ["Promotions"] = "Khuyến mãi",
            ["PromotionUsages"] = "Sử dụng khuyến mãi",
            ["RestaurantSettings"] = "Cài đặt nhà hàng",
            ["ActivityLogs"] = "Nhật ký hoạt động",
            ["TableOperations"] = "Thao tác bàn",
            ["Shifts"] = "Ca làm việc",
            ["EmployeeShifts"] = "Phân ca nhân viên",
            ["RevenueReports"] = "Báo cáo doanh thu",
            ["Dashboard"] = "Tổng quan"
        };

    private static readonly IReadOnlyDictionary<string, string> ActionLabels =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["View"] = "Xem",
            ["Create"] = "Tạo",
            ["Update"] = "Cập nhật",
            ["Delete"] = "Xóa",
            ["Manage"] = "Quản lý",
            ["Cancel"] = "Hủy",
            ["Apply"] = "Áp dụng",
            ["UpdateStatus"] = "Cập nhật trạng thái",
            ["ManageCatalog"] = "Quản lý danh mục",
            ["Transact"] = "Giao dịch",
            ["Adjust"] = "Điều chỉnh",
            ["UpdateAvailability"] = "Cập nhật trạng thái bán",
            ["UpdatePayment"] = "Cập nhật thanh toán",
            ["Transfer"] = "Chuyển bàn",
            ["Merge"] = "Gộp bàn",
            ["Split"] = "Tách bàn"
        };

    public static IReadOnlyCollection<PermissionDefinition> All { get; } = Build();

    private static readonly IReadOnlySet<string> SystemCodes = All
        .Select(definition => definition.Code)
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    public static bool IsSystemPermission(string? code)
    {
        return !string.IsNullOrWhiteSpace(code) &&
               SystemCodes.Contains(code.Trim());
    }

    private static IReadOnlyCollection<PermissionDefinition> Build()
    {
        return typeof(PermissionCodes)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(field =>
                field.IsLiteral &&
                !field.IsInitOnly &&
                field.FieldType == typeof(string))
            .Select(field => (string)field.GetRawConstantValue()!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(code => code, StringComparer.Ordinal)
            .Select(CreateDefinition)
            .ToArray();
    }

    private static PermissionDefinition CreateDefinition(string code)
    {
        var parts = code.Split('.', 2, StringSplitOptions.RemoveEmptyEntries);

        if (parts.Length != 2)
            throw new InvalidOperationException($"Mã quyền không hợp lệ: {code}.");

        var groupName = parts[0];
        var action = parts[1];
        var groupLabel = GroupLabels.TryGetValue(groupName, out var knownGroup)
            ? knownGroup
            : SplitPascalCase(groupName);
        var actionLabel = ActionLabels.TryGetValue(action, out var knownAction)
            ? knownAction
            : SplitPascalCase(action);

        return new PermissionDefinition(
            code,
            $"{actionLabel} {groupLabel}",
            groupName,
            $"Quyền hệ thống được đồng bộ tự động từ mã {code}.");
    }

    private static string SplitPascalCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return value;

        var characters = new List<char>(value.Length + 8);

        for (var index = 0; index < value.Length; index++)
        {
            var current = value[index];

            if (index > 0 && char.IsUpper(current) && !char.IsUpper(value[index - 1]))
                characters.Add(' ');

            characters.Add(current);
        }

        return new string(characters.ToArray());
    }
}
