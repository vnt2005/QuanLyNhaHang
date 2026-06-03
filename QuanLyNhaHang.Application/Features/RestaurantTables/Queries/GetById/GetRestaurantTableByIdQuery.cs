using MediatR;
using QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetById;

public class GetRestaurantTableByIdQuery : IRequest<RestaurantTableDto?>
{
    public Guid Id { get; set; }

    public GetRestaurantTableByIdQuery(Guid id)
    {
        Id = id;
    }
}