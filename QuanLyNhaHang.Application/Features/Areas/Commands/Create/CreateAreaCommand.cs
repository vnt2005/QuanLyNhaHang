using MediatR;

namespace QuanLyNhaHang.Application.Features.Areas.Commands.Create;

public class CreateAreaCommand : IRequest<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
}