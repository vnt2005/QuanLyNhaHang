using MediatR;
using QuanLyNhaHang.Application.Features.Kitchen.Dtos;

namespace QuanLyNhaHang.Application.Features.Kitchen.Queries.GetList;

public class GetKitchenOrdersQuery : IRequest<List<KitchenOrderDto>>
{
}