namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface IUserPermissionService
{
    Task<IReadOnlyCollection<string>> GetPermissionsAsync(
        string roleName,
        CancellationToken cancellationToken = default);
}