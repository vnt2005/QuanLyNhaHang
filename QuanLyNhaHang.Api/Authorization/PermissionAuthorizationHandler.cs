using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Api.Authorization;

public sealed class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    private readonly IApplicationDbContext _context;
    private readonly IUserPermissionService _userPermissionService;

    public PermissionAuthorizationHandler(
        IApplicationDbContext context,
        IUserPermissionService userPermissionService)
    {
        _context = context;
        _userPermissionService = userPermissionService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userIdValue = context.User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
            return;

        var cancellationToken = context.Resource is HttpContext httpContext
            ? httpContext.RequestAborted
            : CancellationToken.None;

        var currentUser = await _context.Users
            .AsNoTracking()
            .Where(user => user.Id == userId)
            .Select(user => new
            {
                user.Role,
                user.IsActive
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (currentUser == null || !currentUser.IsActive)
            return;

        // Admin bypass dựa trên role hiện tại trong database, không dựa trên
        // role claim có thể đã cũ trong JWT.
        if (currentUser.Role.Equals(
                SystemRoles.Admin,
                StringComparison.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
            return;
        }

        var currentPermissions = await _userPermissionService
            .GetPermissionsAsync(currentUser.Role, cancellationToken);

        if (currentPermissions.Contains(
                requirement.PermissionCode,
                StringComparer.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
        }
    }
}
