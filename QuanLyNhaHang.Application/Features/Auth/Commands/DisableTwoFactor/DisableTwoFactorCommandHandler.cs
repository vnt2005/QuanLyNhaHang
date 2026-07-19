using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.DisableTwoFactor;

public class DisableTwoFactorCommandHandler
    : IRequestHandler<DisableTwoFactorCommand, string>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPasswordHasher _passwordHasher;

    public DisableTwoFactorCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPasswordHasher passwordHasher)
    {
        _context = context;
        _currentUserService = currentUserService;
        _passwordHasher = passwordHasher;
    }

    public async Task<string> Handle(
        DisableTwoFactorCommand request,
        CancellationToken cancellationToken)
    {
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

        var passwordValid = _passwordHasher.VerifyPassword(
            request.Password,
            user.PasswordHash);

        if (!passwordValid)
        {
            throw new UnauthorizedAccessException(
                "Mật khẩu xác nhận không đúng.");
        }

        if (!user.TwoFactorEnabled)
            return "Tài khoản chưa bật xác thực 2 yếu tố.";

        user.DisableTwoFactor();

        await _context.SaveChangesAsync(cancellationToken);

        return "Đã tắt xác thực 2 yếu tố.";
    }
}