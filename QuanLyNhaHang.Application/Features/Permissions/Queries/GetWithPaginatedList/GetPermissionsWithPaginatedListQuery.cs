using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Queries.GetWithPaginatedList;

public class GetPermissionsWithPaginatedListQuery : IRequest<PaginatedList<PermissionDto>>
{
    public string? Keyword { get; set; }

    public string? GroupName { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}