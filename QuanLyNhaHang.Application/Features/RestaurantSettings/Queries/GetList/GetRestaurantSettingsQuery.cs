using MediatR;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetList;

public class GetRestaurantSettingsQuery : IRequest<List<RestaurantSettingDto>>
{
    public bool? IsActive { get; set; }
}