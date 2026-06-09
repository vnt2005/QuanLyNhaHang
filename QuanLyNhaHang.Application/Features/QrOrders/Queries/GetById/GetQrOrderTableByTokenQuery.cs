using MediatR;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.QrOrders.Queries.GetById;

public class GetQrOrderTableByTokenQuery : IRequest<QrOrderTableDto?>
{
    public string Token { get; set; } = string.Empty;
}