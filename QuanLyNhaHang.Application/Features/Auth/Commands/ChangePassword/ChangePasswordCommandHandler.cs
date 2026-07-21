using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.ChangePassword;

public sealed class ChangePasswordCommandHandler
    : IRequestHandler<ChangePasswordCommand, string>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthSessionService _authSessionService;

    public ChangePasswordCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPasswordHasher passwordHasher,
        IAuthSessionService authSessionService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _passwordHasher = passwordHasher;
        _authSessionService = authSessionService;
    }

    public async Task<string> Handle(
        ChangePasswordCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
        {
            throw new ArgumentException(
                "Mật khẩu hiện tại không được để trống.");
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) ||
            request.NewPassword.Length < 8)
        {
            throw new ArgumentException(
                "Mật khẩu mới phải có ít nhất 8 ký tự.");
        }

        if (!string.Equals(
                request.NewPassword,
                request.ConfirmNewPassword,
                StringComparison.Ordinal))
        {
            throw new ArgumentException(
                "Xác nhận mật khẩu mới không khớp.");
        }

        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException(
                "Bạn chưa đăng nhập.");

        var user = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Id == userId,
                cancellationToken);

        if (user == null || !user.IsActive)
        {
            throw new UnauthorizedAccessException(
                "Tài khoản không tồn tại hoặc đã bị khóa.");
        }

        if (!_passwordHasher.VerifyPassword(
                request.CurrentPassword,
                user.PasswordHash))
        {
            throw new UnauthorizedAccessException(
                "Mật khẩu hiện tại không đúng.");
        }

        if (_passwordHasher.VerifyPassword(
                request.NewPassword,
                user.PasswordHash))
        {
            throw new ArgumentException(
                "Mật khẩu mới phải khác mật khẩu hiện tại.");
        }

        user.ChangePassword(
            _passwordHasher.HashPassword(request.NewPassword));

        await _context.SaveChangesAsync(cancellationToken);

        await _authSessionService.RevokeAllAsync(
            user.Id,
            "Mật khẩu đã được thay đổi.",
            cancellationToken);

        return "Đổi mật khẩu thành công. Tất cả phiên đăng nhập đã được thu hồi; vui lòng đăng nhập lại.";
    }
}
