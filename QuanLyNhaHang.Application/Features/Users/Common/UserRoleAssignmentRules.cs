using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Users.Common;

internal static class UserRoleAssignmentRules
{
    public static async Task<string> GetActiveRoleNameAsync(
        IApplicationDbContext context,
        string? requestedRole,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(requestedRole))
            throw new ArgumentException("Vai trò người dùng không được để trống.");

        var normalizedRole = requestedRole.Trim().ToUpper();

        var role = await context.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(
                item => item.IsActive &&
                        item.Name.ToUpper() == normalizedRole,
                cancellationToken);

        if (role == null)
        {
            throw new ArgumentException(
                "Vai trò không tồn tại hoặc đã ngừng hoạt động.");
        }

        return role.Name;
    }

    public static async Task EnsureAdminContinuityAsync(
        IApplicationDbContext context,
        User user,
        string newRole,
        bool newIsActive,
        CancellationToken cancellationToken)
    {
        var removesActiveAdmin =
            user.IsActive &&
            user.Role.Equals(
                SystemRoles.Admin,
                StringComparison.OrdinalIgnoreCase) &&
            (!newIsActive ||
             !newRole.Equals(
                 SystemRoles.Admin,
                 StringComparison.OrdinalIgnoreCase));

        if (!removesActiveAdmin)
            return;

        var anotherActiveAdminExists = await context.Users
            .AsNoTracking()
            .AnyAsync(
                item => item.Id != user.Id &&
                        item.IsActive &&
                        item.Role == SystemRoles.Admin,
                cancellationToken);

        if (!anotherActiveAdminExists)
        {
            throw new InvalidOperationException(
                "Không thể hạ quyền hoặc khóa tài khoản Admin cuối cùng.");
        }
    }
}
