using MediatR;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.QrOrders.Queries.GetById;

public class GetQrOrderByIdQuery : IRequest<QrOrderDto?>
{
    public string Token { get; set; } = string.Empty;

    public Guid OrderId { get; set; }
}
