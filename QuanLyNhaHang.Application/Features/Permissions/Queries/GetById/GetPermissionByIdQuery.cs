using MediatR;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Queries.GetById;

public class GetPermissionByIdQuery : IRequest<PermissionDto?>
{
    public Guid Id { get; set; }
}