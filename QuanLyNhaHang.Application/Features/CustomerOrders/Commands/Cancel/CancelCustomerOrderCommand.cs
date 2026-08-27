using MediatR;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Commands.Cancel;

public sealed record CancelCustomerOrderCommand(Guid OrderId) : IRequest<bool>;
