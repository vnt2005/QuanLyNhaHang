namespace QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;

public class CreateQrOrderItemCommand
{
    public Guid MenuItemId { get; set; }

    public int Quantity { get; set; }

    public string? Note { get; set; }
}