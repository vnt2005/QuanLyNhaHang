using MediatR;
using QuanLyNhaHang.Application.Features.Users.DTOs;

namespace QuanLyNhaHang.Application.Features.Users.Queries.GetList;

public class GetUserListQuery : IRequest<List<UserDto>>
{
}