namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }

    Guid? SessionId { get; }

    string? UserName { get; }

    string? IpAddress { get; }

    string? UserAgent { get; }
}
