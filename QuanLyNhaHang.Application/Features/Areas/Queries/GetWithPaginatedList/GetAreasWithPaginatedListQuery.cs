using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Areas.DTOs;

namespace QuanLyNhaHang.Application.Features.Areas.Queries.GetWithPaginatedList;

public class GetAreasWithPaginatedListQuery : IRequest<PaginatedList<AreaDto>>
{
    public string? Keyword { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
