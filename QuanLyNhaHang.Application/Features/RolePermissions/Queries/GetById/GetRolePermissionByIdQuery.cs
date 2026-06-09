using MediatR;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetById;

public class GetRolePermissionByIdQuery : IRequest<RolePermissionDto?>
{
    public Guid Id { get; set; }
}