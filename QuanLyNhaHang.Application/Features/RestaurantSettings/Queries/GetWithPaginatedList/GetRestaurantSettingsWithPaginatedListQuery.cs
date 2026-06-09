using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetWithPaginatedList;

public class GetRestaurantSettingsWithPaginatedListQuery
    : IRequest<PaginatedList<RestaurantSettingDto>>
{
    public string? Keyword { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}