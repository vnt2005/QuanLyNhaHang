using MediatR;
using QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetList;

public class GetRestaurantTableListQuery : IRequest<List<RestaurantTableDto>>
{
}