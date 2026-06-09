using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Roles.DTOs;

namespace QuanLyNhaHang.Application.Features.Roles.Queries.GetWithPaginatedList;

public class GetRolesWithPaginatedListQuery : IRequest<PaginatedList<RoleDto>>
{
    public string? Keyword { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}