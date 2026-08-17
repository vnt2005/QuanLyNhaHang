using System.Text.Json.Serialization;
using MediatR;
using QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Commands.CreateTakeaway;

public sealed class CreateTakeawayOrderCommand : IRequest<QrOrderDto>
{
    [JsonIgnore]
    public Guid? CustomerUserId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public DateTime? PickupTime { get; set; }

    public string? Note { get; set; }

    public List<CreateQrOrderItemCommand> Items { get; set; } = new();
}
