using System.ComponentModel.DataAnnotations;

namespace QuanLyNhaHang.Application.Features.CustomerSite.DTOs;

public sealed class CreateCustomerReservationRequest
{
    public Guid RestaurantTableId { get; set; }

    [Required]
    [StringLength(120, MinimumLength = 2)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [StringLength(20, MinimumLength = 9)]
    public string PhoneNumber { get; set; } = string.Empty;

    [EmailAddress]
    [StringLength(256)]
    public string? Email { get; set; }

    [Range(1, 100)]
    public int NumberOfGuests { get; set; }

    public DateTime ReservationTime { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}
