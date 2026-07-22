using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using System.Security.Cryptography;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.ForgotPassword;

public class ForgotPasswordCommandHandler
    : IRequestHandler<ForgotPasswordCommand, string>
{
    private const string GenericMessage =
        "Nếu email tồn tại trong hệ thống, " +
        "mã đặt lại mật khẩu sẽ được gửi đến email đó.";

    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IPasswordHasher _passwordHasher;

    public ForgotPasswordCommandHandler(
        IApplicationDbContext context,
        IEmailService emailService,
        IPasswordHasher passwordHasher)
    {
        _context = context;
        _emailService = emailService;
        _passwordHasher = passwordHasher;
    }

    public async Task<string> Handle(
        ForgotPasswordCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return GenericMessage;

        var email = request.Email.Trim().ToLower();

        var user = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Email == email,
                cancellationToken);

        if (user == null ||
            !user.IsActive ||
            !user.IsEmailVerified)
        {
            return GenericMessage;
        }

        var now = DateTime.UtcNow;

        if (user.IsPasswordResetLocked(now))
            return GenericMessage;

        var code = RandomNumberGenerator
            .GetInt32(0, 1_000_000)
            .ToString("D6");

        var codeHash = _passwordHasher.HashPassword(code);

        user.SetPasswordResetCode(
            codeHash,
            now.AddMinutes(10));

        await _context.SaveChangesAsync(cancellationToken);

        await _emailService.SendAsync(
            user.Email,
            "Mã đặt lại mật khẩu",
            $"Mã đặt lại mật khẩu của bạn là: {code}. " +
            "Mã này có hiệu lực trong 10 phút.");

        return GenericMessage;
    }
}