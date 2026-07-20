using MediatR;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Commands.SyncCatalog;

public sealed record SyncPermissionCatalogCommand
    : IRequest<PermissionCatalogSyncResultDto>;
