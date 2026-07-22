namespace QuanLyNhaHang.Application.Features.Users.DTOs;

public class UserDto
{
    public Guid Id { get; set; }

    public string? Ho { get; set; }

    public string Ten { get; set; } = default!;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public bool IsEmailVerified { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}