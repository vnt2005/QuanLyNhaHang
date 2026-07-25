using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Orders.DTOs;

namespace QuanLyNhaHang.Application.Features.Orders.Queries.GetWithPaginatedList;

public class GetOrdersWithPaginatedListQuery : IRequest<PaginatedList<OrderDto>>
{
    public string? Keyword { get; set; }

    public Guid? RestaurantTableId { get; set; }

    public string? Status { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
