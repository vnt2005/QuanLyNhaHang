using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Users.Commands.Delete;

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteUserCommand request,
        CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (user == null)
        {
            throw new Exception("Không tìm thấy người dùng.");
        }

        _context.Users.Remove(user);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}