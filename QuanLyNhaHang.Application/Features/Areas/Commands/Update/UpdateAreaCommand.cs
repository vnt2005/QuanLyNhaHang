using MediatR;

namespace QuanLyNhaHang.Application.Features.Areas.Commands.Update;

public class UpdateAreaCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
}