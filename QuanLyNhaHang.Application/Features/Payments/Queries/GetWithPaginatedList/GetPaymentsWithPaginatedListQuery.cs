using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetWithPaginatedList;

public class GetPaymentsWithPaginatedListQuery : IRequest<PaginatedList<PaymentDto>>
{
    public string? Keyword { get; set; }

    public string? Status { get; set; }

    public string? PaymentMethod { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}