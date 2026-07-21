using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface IJwtTokenService
{
    string GenerateToken(
        User user,
        Guid sessionId,
        IEnumerable<string>? permissions = null);
}
