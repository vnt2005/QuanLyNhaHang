using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.ResetPassword;

public class ResetPasswordCommandHandler
    : IRequestHandler<ResetPasswordCommand, string>
{
    private const string InvalidCodeMessage =
        "Mã đặt lại mật khẩu không đúng hoặc đã hết hạn.";

    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public ResetPasswordCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<string> Handle(
        ResetPasswordCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) ||
            request.NewPassword.Length < 8)
        {
            throw new ArgumentException(
                "Mật khẩu mới phải có ít nhất 8 ký tự.");
        }

        var email = request.Email.Trim().ToLower();

        var user = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Email == email,
                cancellationToken);

        if (user == null || !user.IsActive)
            throw new ArgumentException(InvalidCodeMessage);

        var now = DateTime.UtcNow;

        if (user.IsPasswordResetLocked(now))
            throw new ArgumentException(InvalidCodeMessage);

        var codeValid =
            user.HasActivePasswordResetCode(now) &&
            _passwordHasher.VerifyPassword(
                request.Code,
                user.PasswordResetCode!);

        if (!codeValid)
        {
            user.RegisterPasswordResetFailure(now);

            await _context.SaveChangesAsync(cancellationToken);

            throw new ArgumentException(InvalidCodeMessage);
        }

        var newPasswordHash =
            _passwordHasher.HashPassword(
                request.NewPassword);

        // ChangePassword đã tự ClearPasswordResetCode.
        user.ChangePassword(newPasswordHash);

        await _context.SaveChangesAsync(cancellationToken);

        return "Đặt lại mật khẩu thành công.";
    }
}