namespace QuanLyNhaHang.Application.Features.Orders.DTOs;

public class OrderDto
{
    public Guid Id { get; set; }

    public Guid? RestaurantTableId { get; set; }

    public string RestaurantTableName { get; set; } = string.Empty;

    public string OrderType { get; set; } = "DineIn";

    public string? CustomerName { get; set; }

    public string? CustomerPhoneNumber { get; set; }

    public DateTime? PickupTime { get; set; }

    public string OrderCode { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public bool IsPaid { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<OrderItemDto> Items { get; set; } = new();
}
