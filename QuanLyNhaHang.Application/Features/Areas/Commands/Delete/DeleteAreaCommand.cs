using MediatR;

namespace QuanLyNhaHang.Application.Features.Areas.Commands.Delete;

public class DeleteAreaCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public DeleteAreaCommand(Guid id)
    {
        Id = id;
    }
}