namespace QuanLyNhaHang.Application.Features.Auth.DTOs;

public sealed class CurrentSessionDto
{
    public Guid UserId { get; set; }

    public string? Ho { get; set; }

    public string Ten { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public bool TwoFactorEnabled { get; set; }

    public List<string> Permissions { get; set; } = new();
}
