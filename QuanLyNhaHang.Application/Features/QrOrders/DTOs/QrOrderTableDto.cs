namespace QuanLyNhaHang.Application.Features.QrOrders.DTOs;

public class QrOrderTableDto
{
    public Guid RestaurantTableId { get; set; }

    public string RestaurantTableName { get; set; } = string.Empty;

    public string TableStatus { get; set; } = string.Empty;

    public string QrStatus { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public string Token { get; set; } = string.Empty;
}