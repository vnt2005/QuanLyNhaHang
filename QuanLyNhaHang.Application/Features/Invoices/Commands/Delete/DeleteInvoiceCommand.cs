using MediatR;

namespace QuanLyNhaHang.Application.Features.Invoices.Commands.Delete;

public class DeleteInvoiceCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}