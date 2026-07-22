using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.VerifyEmail;

public sealed class VerifyEmailCommandHandler
    : IRequestHandler<VerifyEmailCommand, string>
{
    private const string InvalidCodeMessage =
        "Mã xác minh email không đúng hoặc đã hết hạn.";

    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public VerifyEmailCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<string> Handle(
        VerifyEmailCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Code))
        {
            throw new UnauthorizedAccessException(InvalidCodeMessage);
        }

        var email = request.Email.Trim().ToLower();

        var user = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Email == email,
                cancellationToken);

        if (user == null ||
            !user.IsActive ||
            user.IsEmailVerified)
        {
            throw new UnauthorizedAccessException(InvalidCodeMessage);
        }

        var now = DateTime.UtcNow;

        if (user.IsEmailVerificationLocked(now))
            throw new UnauthorizedAccessException(InvalidCodeMessage);

        var codeValid =
            user.HasActiveEmailVerificationCode(now) &&
            _passwordHasher.VerifyPassword(
                request.Code,
                user.EmailVerificationCode!);

        if (!codeValid)
        {
            user.RegisterEmailVerificationFailure(now);
            await _context.SaveChangesAsync(cancellationToken);

            throw new UnauthorizedAccessException(InvalidCodeMessage);
        }

        user.MarkEmailVerified();
        await _context.SaveChangesAsync(cancellationToken);

        return "Xác minh email thành công. Bạn có thể đăng nhập.";
    }
}
