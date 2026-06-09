namespace QuanLyNhaHang.Application.Features.QrOrders.DTOs;

public class QrOrderMenuItemDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal Price { get; set; }
}