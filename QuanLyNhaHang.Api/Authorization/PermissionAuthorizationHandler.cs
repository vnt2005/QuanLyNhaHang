using Microsoft.AspNetCore.Authorization;
using QuanLyNhaHang.Application.Common.Constants;

namespace QuanLyNhaHang.Api.Authorization;

public sealed class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        // Admin luôn có toàn quyền, tránh tự khóa hệ thống.
        if (context.User.IsInRole(SystemRoles.Admin))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        var hasPermission = context.User.Claims.Any(x =>
            x.Type == CustomClaimTypes.Permission &&
            string.Equals(
                x.Value,
                requirement.PermissionCode,
                StringComparison.OrdinalIgnoreCase));

        if (hasPermission)
            context.Succeed(requirement);

        return Task.CompletedTask;
    }
}