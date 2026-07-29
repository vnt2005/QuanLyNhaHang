using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.EnableTwoFactor;

public class EnableTwoFactorCommandHandler
    : IRequestHandler<EnableTwoFactorCommand, string>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailService _emailService;

    public EnableTwoFactorCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPasswordHasher passwordHasher,
        IEmailService emailService)
    {
        _context = context;
        _currentUserService = currentUserService;
        _passwordHasher = passwordHasher;
        _emailService = emailService;
    }

    public async Task<string> Handle(
        EnableTwoFactorCommand request,
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

        if (user.TwoFactorEnabled)
            return "Tài khoản đã bật xác thực 2 yếu tố.";

        await _emailService.SendAsync(
            user.Email,
            "Xác thực 2 yếu tố đã được bật",
            "Kênh email bảo mật đã được kiểm tra thành công. " +
            "Từ lần đăng nhập tiếp theo, hệ thống sẽ gửi mã xác thực " +
            "dùng một lần tới địa chỉ email này.");

        user.EnableTwoFactor();

        await _context.SaveChangesAsync(cancellationToken);

        return
            "Đã bật xác thực 2 yếu tố và gửi email xác nhận.";
    }
}
