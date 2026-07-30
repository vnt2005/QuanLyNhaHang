using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetWithPaginatedList;

public class GetRestaurantTablesWithPaginatedListQuery
    : IRequest<PaginatedList<RestaurantTableDto>>
{
    public string? Keyword { get; set; }

    public Guid? AreaId { get; set; }

    public string? Status { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
