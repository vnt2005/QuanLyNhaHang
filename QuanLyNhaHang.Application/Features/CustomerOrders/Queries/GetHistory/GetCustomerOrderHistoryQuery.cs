using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Queries.GetHistory;

public class GetCustomerOrderHistoryQuery
    : IRequest<PaginatedList<QrOrderDto>>
{
    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}

