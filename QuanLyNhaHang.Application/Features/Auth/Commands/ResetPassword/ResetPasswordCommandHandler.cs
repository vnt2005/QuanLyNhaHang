using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.ResetPassword;

public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, string>
{
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
        var email = request.Email.Trim().ToLower();

        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (user == null)
        {
            throw new Exception("Tài khoản không tồn tại.");
        }

        if (!user.IsActive)
        {
            throw new Exception("Tài khoản đã bị khóa.");
        }

        if (!user.IsPasswordResetCodeValid(request.Code))
        {
            throw new Exception("Mã đặt lại mật khẩu không đúng hoặc đã hết hạn.");
        }

        var newPasswordHash = _passwordHasher.HashPassword(request.NewPassword);

        user.ChangePassword(newPasswordHash);
        user.ClearPasswordResetCode();

        await _context.SaveChangesAsync(cancellationToken);

        return "Đặt lại mật khẩu thành công.";
    }
}