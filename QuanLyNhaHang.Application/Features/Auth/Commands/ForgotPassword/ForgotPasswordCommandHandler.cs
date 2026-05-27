using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.ForgotPassword;

public class ForgotPasswordCommandHandler : IRequestHandler<ForgotPasswordCommand, string>
{
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;

    public ForgotPasswordCommandHandler(
        IApplicationDbContext context,
        IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    public async Task<string> Handle(
        ForgotPasswordCommand request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLower();

        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (user == null)
        {
            throw new Exception("Email không tồn tại trong hệ thống.");
        }

        if (!user.IsActive)
        {
            throw new Exception("Tài khoản đã bị khóa.");
        }

        var code = Random.Shared.Next(100000, 999999).ToString();

        user.SetPasswordResetCode(
            code,
            DateTime.UtcNow.AddMinutes(10));

        await _context.SaveChangesAsync(cancellationToken);

        await _emailService.SendAsync(
            user.Email,
            "Mã đặt lại mật khẩu",
            $"Mã đặt lại mật khẩu của bạn là: {code}. Mã này có hiệu lực trong 10 phút.");

        return "Mã đặt lại mật khẩu đã được gửi về email.";
    }
}