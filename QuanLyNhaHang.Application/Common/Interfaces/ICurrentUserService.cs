namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }

    string? UserName { get; }

    string? IpAddress { get; }

    string? UserAgent { get; }
}