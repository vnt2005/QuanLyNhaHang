namespace QuanLyNhaHang.Application.Features.TableOperations.DTOs;

public class TableOperationDetailDto
{
    public Guid Id { get; set; }

    public Guid TableOperationId { get; set; }

    public Guid? FromOrderId { get; set; }

    public Guid? ToOrderId { get; set; }

    public Guid? OrderItemId { get; set; }

    public Guid? MenuItemId { get; set; }

    public string? MenuItemName { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }
}