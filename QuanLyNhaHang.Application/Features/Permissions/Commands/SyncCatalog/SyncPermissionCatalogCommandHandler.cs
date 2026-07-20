using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Permissions.Commands.SyncCatalog;

public sealed class SyncPermissionCatalogCommandHandler
    : IRequestHandler<SyncPermissionCatalogCommand, PermissionCatalogSyncResultDto>
{
    private readonly IApplicationDbContext _context;

    public SyncPermissionCatalogCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PermissionCatalogSyncResultDto> Handle(
        SyncPermissionCatalogCommand request,
        CancellationToken cancellationToken)
    {
        var catalog = PermissionCatalog.All;
        var existingCodes = await _context.Permissions
            .AsNoTracking()
            .Select(permission => permission.Code)
            .ToListAsync(cancellationToken);
        var existingCodeSet = new HashSet<string>(
            existingCodes,
            StringComparer.OrdinalIgnoreCase);
        var missingDefinitions = catalog
            .Where(definition => !existingCodeSet.Contains(definition.Code))
            .ToArray();

        if (missingDefinitions.Length > 0)
        {
            var permissions = missingDefinitions.Select(definition =>
                new Permission(
                    definition.Code,
                    definition.Name,
                    definition.GroupName,
                    definition.Description));

            _context.Permissions.AddRange(permissions);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return new PermissionCatalogSyncResultDto
        {
            CatalogCount = catalog.Count,
            ExistingCount = catalog.Count - missingDefinitions.Length,
            AddedCount = missingDefinitions.Length,
            AddedCodes = missingDefinitions
                .Select(definition => definition.Code)
                .ToArray()
        };
    }
}
