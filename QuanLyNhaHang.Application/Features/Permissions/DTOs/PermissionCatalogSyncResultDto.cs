namespace QuanLyNhaHang.Application.Features.Permissions.DTOs;

public sealed class PermissionCatalogSyncResultDto
{
    public int CatalogCount { get; set; }

    public int ExistingCount { get; set; }

    public int AddedCount { get; set; }

    public IReadOnlyCollection<string> AddedCodes { get; set; } = Array.Empty<string>();
}
