using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Users.DTOs;

namespace QuanLyNhaHang.Application.Features.Users.Queries.GetWithPaginatedList;

public class GetUsersWithPaginatedListQuery : IRequest<PaginatedList<UserDto>>
{
    public string? Keyword { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}