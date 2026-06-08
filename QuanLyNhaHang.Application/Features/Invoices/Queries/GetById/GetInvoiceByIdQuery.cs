using MediatR;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Queries.GetById;

public class GetInvoiceByIdQuery : IRequest<InvoiceDto?>
{
    public Guid Id { get; set; }
}