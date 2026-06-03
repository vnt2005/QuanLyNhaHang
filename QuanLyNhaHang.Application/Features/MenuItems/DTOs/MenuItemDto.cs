namespace QuanLyNhaHang.Application.Features.MenuItems.DTOs;

public class MenuItemDto
{
    public Guid Id { get; set; }

    public Guid MenuCategoryId { get; set; }

    public string MenuCategoryName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? ImageUrl { get; set; }

    public bool IsAvailable { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}