using MediatR;
using QuanLyNhaHang.Application.Features.Roles.DTOs;

namespace QuanLyNhaHang.Application.Features.Roles.Queries.GetList;

public class GetRolesQuery : IRequest<List<RoleDto>>
{
    public bool? IsActive { get; set; }
}