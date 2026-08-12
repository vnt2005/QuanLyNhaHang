using MediatR;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Commands.Claim;

public class ClaimCustomerOrderCommand : IRequest<bool>
{
    public Guid OrderId { get; set; }

    public string Token { get; set; } = string.Empty;
}
