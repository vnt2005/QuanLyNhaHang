namespace QuanLyNhaHang.Application.Features.Kitchen.Dtos;

public class KitchenOrderDto
{
    public Guid OrderId { get; set; }

    public string OrderCode { get; set; } = string.Empty;

    public Guid RestaurantTableId { get; set; }

    public string RestaurantTableName { get; set; } = string.Empty;

    public string OrderStatus { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public List<KitchenOrderItemDto> Items { get; set; } = new();
}