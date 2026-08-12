using QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Commands.Create;

public class CreateCustomerOrderRequest
{
    public string Token { get; set; } = string.Empty;

    public string? Note { get; set; }

    public List<CreateQrOrderItemCommand> Items { get; set; } = new();
}

