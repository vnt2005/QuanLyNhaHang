using MediatR;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Queries.GetList;

public class GetPermissionsQuery : IRequest<List<PermissionDto>>
{
    public string? GroupName { get; set; }

    public bool? IsActive { get; set; }
}