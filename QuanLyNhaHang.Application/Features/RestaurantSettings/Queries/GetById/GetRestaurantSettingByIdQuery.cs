using MediatR;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetById;

public class GetRestaurantSettingByIdQuery : IRequest<RestaurantSettingDto?>
{
    public Guid Id { get; set; }
}