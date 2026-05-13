using MediatR;

namespace QuanLyNhaHang.Application.Features.Users.Commands.Delete;

public class DeleteUserCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public DeleteUserCommand(Guid id)
    {
        Id = id;
    }
}