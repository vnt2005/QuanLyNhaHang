using System.Text.Json.Serialization;

namespace QuanLyNhaHang.Application.Features.Auth.DTOs;

public class AuthResponseDto
{
    public Guid UserId { get; set; }

    public Guid? SessionId { get; set; }

    public string? Ho { get; set; }

    public string Ten { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public bool IsActive { get; set; }

    public bool TwoFactorEnabled { get; set; }

    public bool RequiresTwoFactor { get; set; }

    public string Token { get; set; } = string.Empty;

    public string RefreshToken { get; set; } = string.Empty;

    public DateTime? RefreshTokenExpiresAt { get; set; }

    public List<string> Permissions { get; set; } = new();

    [JsonIgnore]
    public string Message { get; set; } = string.Empty;
}
