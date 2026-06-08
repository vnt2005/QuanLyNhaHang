using MediatR;
using QuanLyNhaHang.Application.Features.Invoices.DTOs;

namespace QuanLyNhaHang.Application.Features.Invoices.Commands.Update;

public class UpdateInvoiceCommand : IRequest<InvoiceDto>
{
    public Guid Id { get; set; }

    public string? Status { get; set; }

    public string? Note { get; set; }
}