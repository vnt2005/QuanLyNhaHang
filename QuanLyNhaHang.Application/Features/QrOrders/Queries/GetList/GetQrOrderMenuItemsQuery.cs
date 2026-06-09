using MediatR;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.QrOrders.Queries.GetList;

public class GetQrOrderMenuItemsQuery : IRequest<List<QrOrderMenuItemDto>>
{
    public string Token { get; set; } = string.Empty;
}