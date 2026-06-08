using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Queries.GetWithPaginatedList;

public class GetInvoicesWithPaginatedListQuery : IRequest<PaginatedList<InvoiceDto>>
{
    public string? Keyword { get; set; }

    public string? Status { get; set; }

    public string? PaymentMethod { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}