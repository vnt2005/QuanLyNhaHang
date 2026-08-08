using MediatR;
using QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetSelectable;

public sealed record GetSelectableRestaurantTablesQuery(string? Purpose)
    : IRequest<List<RestaurantTableDto>>;
