using MediatR;

namespace QuanLyNhaHang.Application.Features.Permissions.Commands.Delete;

public class DeletePermissionCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}