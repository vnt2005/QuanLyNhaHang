namespace QuanLyNhaHang.Application.Features.Orders.Commands.Create;

public class CreateOrderItemRequest
{
    public Guid MenuItemId { get; set; }

    public int Quantity { get; set; }

    public string? Note { get; set; }
}