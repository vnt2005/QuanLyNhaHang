namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Create;

public class SplitTableItemCommand
{
    public Guid OrderItemId { get; set; }

    public int Quantity { get; set; }
}