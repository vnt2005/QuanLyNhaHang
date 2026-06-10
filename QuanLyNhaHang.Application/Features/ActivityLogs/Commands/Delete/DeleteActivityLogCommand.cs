using MediatR;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Commands.Delete;

public class DeleteActivityLogCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}