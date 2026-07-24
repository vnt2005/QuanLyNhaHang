using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Users.Common;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Users.Commands.Create;

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateUserCommand request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLower();
        var phoneNumber = request.PhoneNumber.Trim();

        var emailExists = await _context.Users
            .AnyAsync(x => x.Email == email, cancellationToken);

        if (emailExists)
        {
            throw new Exception("Email đã tồn tại.");
        }

        var phoneExists = await _context.Users
            .AnyAsync(x => x.PhoneNumber == phoneNumber, cancellationToken);

        if (phoneExists)
        {
            throw new Exception("Số điện thoại đã tồn tại.");
        }

        var role = await UserRoleAssignmentRules.GetActiveRoleNameAsync(
            _context,
            request.Role,
            cancellationToken);

        var user = new User(
            request.Ho,
            request.Ten,
            request.Email,
            request.PhoneNumber,
            request.PasswordHash,
            role);

        // Tài khoản do quản trị viên tạo được xem là đã xác minh.
        user.MarkEmailVerified();

        _context.Users.Add(user);

        await _context.SaveChangesAsync(cancellationToken);

        return user.Id;
    }
}
