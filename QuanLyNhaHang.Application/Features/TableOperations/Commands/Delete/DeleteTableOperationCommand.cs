using MediatR;

namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Delete;

public class DeleteTableOperationCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}