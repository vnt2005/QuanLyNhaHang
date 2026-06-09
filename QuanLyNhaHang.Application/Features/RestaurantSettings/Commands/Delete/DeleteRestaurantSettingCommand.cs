using MediatR;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Commands.Delete;

public class DeleteRestaurantSettingCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}