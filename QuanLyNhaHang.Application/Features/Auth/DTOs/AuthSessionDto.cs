namespace QuanLyNhaHang.Application.Features.Auth.DTOs;

public sealed class AuthSessionDto
{
    public Guid SessionId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? LastUsedAt { get; set; }

    public DateTime? RevokedAt { get; set; }

    public string? RevocationReason { get; set; }

    public string? IpAddress { get; set; }

    public string? UserAgent { get; set; }

    public bool IsActive { get; set; }

    public bool IsCurrent { get; set; }
}
