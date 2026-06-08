using MediatR;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Commands.Create;

public class CreateInvoiceCommand : IRequest<InvoiceDto>
{
    public Guid PaymentId { get; set; }

    public string? Note { get; set; }
}