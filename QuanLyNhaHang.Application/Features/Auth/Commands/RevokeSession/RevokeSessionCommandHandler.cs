using MediatR;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.RevokeSession;

public sealed class RevokeSessionCommandHandler
    : IRequestHandler<RevokeSessionCommand, bool>
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuthSessionService _authSessionService;

    public RevokeSessionCommandHandler(
        ICurrentUserService currentUserService,
        IAuthSessionService authSessionService)
    {
        _currentUserService = currentUserService;
        _authSessionService = authSessionService;
    }

    public async Task<bool> Handle(
        RevokeSessionCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;

        if (!userId.HasValue)
        {
            throw new UnauthorizedAccessException(
                "Không xác định được người dùng hiện tại.");
        }

        var revoked = await _authSessionService.RevokeSessionAsync(
            userId.Value,
            request.SessionId,
            "Người dùng đã thu hồi phiên đăng nhập.",
            cancellationToken);

        if (!revoked)
        {
            throw new KeyNotFoundException(
                "Không tìm thấy phiên đăng nhập đang hoạt động.");
        }

        return true;
    }
}
