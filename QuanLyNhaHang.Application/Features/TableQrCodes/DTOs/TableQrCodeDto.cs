namespace QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

public class TableQrCodeDto
{
    public Guid Id { get; set; }

    public Guid RestaurantTableId { get; set; }

    public string RestaurantTableName { get; set; } = string.Empty;

    public string Token { get; set; } = string.Empty;

    public string QrCodeUrl { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}