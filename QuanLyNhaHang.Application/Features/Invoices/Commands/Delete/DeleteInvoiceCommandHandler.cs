using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Invoices.Commands.Delete;

public class DeleteInvoiceCommandHandler
    : IRequestHandler<DeleteInvoiceCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteInvoiceCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteInvoiceCommand request,
        CancellationToken cancellationToken)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (invoice == null)
            throw new Exception("Không tìm thấy hóa đơn.");

        invoice.Cancel();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}