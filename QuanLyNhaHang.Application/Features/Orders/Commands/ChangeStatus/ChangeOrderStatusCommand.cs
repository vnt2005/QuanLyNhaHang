using MediatR;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.ChangeStatus;

public class ChangeOrderStatusCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public string Status { get; set; } = string.Empty;
}