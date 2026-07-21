using MediatR;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.LogoutAll;

public sealed class LogoutAllCommandHandler
    : IRequestHandler<LogoutAllCommand, int>
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuthSessionService _authSessionService;

    public LogoutAllCommandHandler(
        ICurrentUserService currentUserService,
        IAuthSessionService authSessionService)
    {
        _currentUserService = currentUserService;
        _authSessionService = authSessionService;
    }

    public async Task<int> Handle(
        LogoutAllCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;

        if (!userId.HasValue)
        {
            throw new UnauthorizedAccessException(
                "Không xác định được người dùng hiện tại.");
        }

        return await _authSessionService.RevokeAllAsync(
            userId.Value,
            "Người dùng đã đăng xuất khỏi tất cả thiết bị.",
            cancellationToken);
    }
}
