namespace QuanLyNhaHang.Application.Features.Auth.DTOs;

public class AuthResponseDto
{
    public Guid UserId { get; set; }

    public string? Ho { get; set; }

    public string Ten { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string Token { get; set; } = string.Empty;
}