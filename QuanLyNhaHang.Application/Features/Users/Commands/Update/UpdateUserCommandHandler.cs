using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Users.Commands.Update;

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateUserCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (user == null)
        {
            throw new Exception("Không tìm thấy người dùng.");
        }

        var email = request.Email.Trim().ToLower();
        var phoneNumber = request.PhoneNumber.Trim();

        var emailExists = await _context.Users
            .AnyAsync(x =>
                x.Email == email &&
                x.Id != request.Id,
                cancellationToken);

        if (emailExists)
        {
            throw new Exception("Email đã tồn tại.");
        }

        var phoneExists = await _context.Users
            .AnyAsync(x =>
                x.PhoneNumber == phoneNumber &&
                x.Id != request.Id,
                cancellationToken);

        if (phoneExists)
        {
            throw new Exception("Số điện thoại đã tồn tại.");
        }

        user.UpdateInfo(
            request.Ho,
            request.Ten,
            request.Email,
            request.PhoneNumber,
            request.Role);

        if (request.IsActive)
        {
            user.Activate();
        }
        else
        {
            user.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}