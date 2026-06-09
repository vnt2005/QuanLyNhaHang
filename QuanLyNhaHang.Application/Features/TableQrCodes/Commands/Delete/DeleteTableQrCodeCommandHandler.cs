using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Delete;

public class DeleteTableQrCodeCommandHandler
    : IRequestHandler<DeleteTableQrCodeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteTableQrCodeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteTableQrCodeCommand request,
        CancellationToken cancellationToken)
    {
        var qrCode = await _context.TableQrCodes
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (qrCode == null)
            throw new Exception("Không tìm thấy mã QR.");

        qrCode.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}