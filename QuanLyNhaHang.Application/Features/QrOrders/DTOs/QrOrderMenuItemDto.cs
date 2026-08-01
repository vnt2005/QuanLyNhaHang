namespace QuanLyNhaHang.Application.Features.QrOrders.DTOs;

public class QrOrderMenuItemDto
{
    public Guid Id { get; set; }

    public Guid MenuCategoryId { get; set; }

    public string MenuCategoryName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? ImageUrl { get; set; }
}
