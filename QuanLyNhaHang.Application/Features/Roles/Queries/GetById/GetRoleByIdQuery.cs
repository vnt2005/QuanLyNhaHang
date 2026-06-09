using MediatR;
using QuanLyNhaHang.Application.Features.Roles.DTOs;

namespace QuanLyNhaHang.Application.Features.Roles.Queries.GetById;

public class GetRoleByIdQuery : IRequest<RoleDto?>
{
    public Guid Id { get; set; }
}