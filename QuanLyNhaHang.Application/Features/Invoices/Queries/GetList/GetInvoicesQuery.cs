using MediatR;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Queries.GetList;

public class GetInvoicesQuery : IRequest<List<InvoiceDto>>
{
    public string? Status { get; set; }

    public string? PaymentMethod { get; set; }
}