using MediatR;
using QuanLyNhaHang.Application.Features.Orders.DTOs;

namespace QuanLyNhaHang.Application.Features.Orders.Queries.GetList;

public class GetOrderListQuery : IRequest<List<OrderDto>>
{
}