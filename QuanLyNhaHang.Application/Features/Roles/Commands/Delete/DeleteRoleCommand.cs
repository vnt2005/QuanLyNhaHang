using MediatR;

namespace QuanLyNhaHang.Application.Features.Roles.Commands.Delete;

public class DeleteRoleCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}