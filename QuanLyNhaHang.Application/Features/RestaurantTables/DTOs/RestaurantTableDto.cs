namespace QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;

public class RestaurantTableDto
{
    public Guid Id { get; set; }

    public Guid AreaId { get; set; }

    public string AreaName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}