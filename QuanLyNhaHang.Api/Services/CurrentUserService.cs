using System.Security.Claims;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;

            var value =
                user?.FindFirstValue(ClaimTypes.NameIdentifier) ??
                user?.FindFirstValue("sub") ??
                user?.FindFirstValue("userId");

            return Guid.TryParse(value, out var userId)
                ? userId
                : null;
        }
    }

    public Guid? SessionId
    {
        get
        {
            var value = _httpContextAccessor.HttpContext?
                .User
                .FindFirstValue(CustomClaimTypes.SessionId);

            return Guid.TryParse(value, out var sessionId)
                ? sessionId
                : null;
        }
    }

    public string? UserName
    {
        get
        {
            var user = _httpContextAccessor.HttpContext?.User;

            return user?.Identity?.Name ??
                   user?.FindFirstValue(ClaimTypes.Name) ??
                   user?.FindFirstValue("name") ??
                   user?.FindFirstValue("email");
        }
    }

    public string? IpAddress
    {
        get
        {
            return _httpContextAccessor.HttpContext?
                .Connection
                .RemoteIpAddress?
                .ToString();
        }
    }

    public string? UserAgent
    {
        get
        {
            return _httpContextAccessor.HttpContext?
                .Request
                .Headers
                .UserAgent
                .ToString();
        }
    }
}
