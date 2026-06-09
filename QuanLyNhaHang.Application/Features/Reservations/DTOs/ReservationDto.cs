namespace QuanLyNhaHang.Application.Features.Reservations.DTOs;

public class ReservationDto
{
    public Guid Id { get; set; }

    public string ReservationCode { get; set; } = string.Empty;

    public Guid RestaurantTableId { get; set; }

    public string RestaurantTableName { get; set; } = string.Empty;

    public string CustomerName { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string? Email { get; set; }

    public int NumberOfGuests { get; set; }

    public DateTime ReservationTime { get; set; }

    public decimal DepositAmount { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ConfirmedAt { get; set; }

    public DateTime? CheckedInAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}