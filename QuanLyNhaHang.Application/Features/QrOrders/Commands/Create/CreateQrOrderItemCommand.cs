using MediatR;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;

public class CreateQrOrderCommand : IRequest<QrOrderDto>
{
    public string Token { get; set; } = string.Empty;

    public string? Note { get; set; }

    public List<CreateQrOrderItemCommand> Items { get; set; } = new();
}