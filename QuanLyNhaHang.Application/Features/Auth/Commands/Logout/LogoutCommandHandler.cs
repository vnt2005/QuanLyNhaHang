using MediatR;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.Logout;

public sealed class LogoutCommandHandler : IRequestHandler<LogoutCommand, bool>
{
    private readonly IAuthSessionService _authSessionService;

    public LogoutCommandHandler(IAuthSessionService authSessionService)
    {
        _authSessionService = authSessionService;
    }

    public async Task<bool> Handle(
        LogoutCommand request,
        CancellationToken cancellationToken)
    {
        await _authSessionService.RevokeByRefreshTokenAsync(
            request.RefreshToken,
            "Người dùng đã đăng xuất.",
            cancellationToken);

        // Logout được xử lý idempotent để không tiết lộ token có tồn tại hay không.
        return true;
    }
}
