using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Delete;

public class DeleteTableOperationCommandHandler
    : IRequestHandler<DeleteTableOperationCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteTableOperationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteTableOperationCommand request,
        CancellationToken cancellationToken)
    {
        var operation = await _context.TableOperations
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (operation == null)
            throw new Exception("Không tìm thấy thao tác bàn.");

        operation.Cancel();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}