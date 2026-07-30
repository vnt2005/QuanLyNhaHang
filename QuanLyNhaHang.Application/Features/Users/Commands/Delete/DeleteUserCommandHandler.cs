using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Users.Commands.Delete;

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public DeleteUserCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<bool> Handle(
        DeleteUserCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.UserId == request.Id)
        {
            throw new InvalidOperationException(
                "Không thể xóa chính tài khoản đang đăng nhập.");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (user == null)
        {
            throw new Exception("Không tìm thấy người dùng.");
        }

        if (user.Role == "Admin" && user.IsActive)
        {
            var activeAdminCount = await _context.Users
                .CountAsync(
                    x => x.Role == "Admin" && x.IsActive,
                    cancellationToken);

            if (activeAdminCount <= 1)
            {
                throw new InvalidOperationException(
                    "Không thể xóa Admin đang hoạt động cuối cùng của hệ thống.");
            }
        }

        _context.Users.Remove(user);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
