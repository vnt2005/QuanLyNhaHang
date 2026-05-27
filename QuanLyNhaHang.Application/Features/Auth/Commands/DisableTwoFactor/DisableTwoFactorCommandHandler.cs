using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.DisableTwoFactor;

public class DisableTwoFactorCommandHandler : IRequestHandler<DisableTwoFactorCommand, string>
{
    private readonly IApplicationDbContext _context;

    public DisableTwoFactorCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<string> Handle(
        DisableTwoFactorCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == request.UserId, cancellationToken);

        if (user == null)
        {
            throw new Exception("Người dùng không tồn tại.");
        }

        if (!user.IsActive)
        {
            throw new Exception("Tài khoản đã bị khóa.");
        }

        user.DisableTwoFactor();

        await _context.SaveChangesAsync(cancellationToken);

        return "Đã tắt xác thực 2 yếu tố.";
    }
}