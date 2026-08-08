using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Queries.GetById;

public class GetTableQrCodeByIdQueryHandler
    : IRequestHandler<GetTableQrCodeByIdQuery, TableQrCodeDto?>
{
    private readonly IApplicationDbContext _context;

    public GetTableQrCodeByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TableQrCodeDto?> Handle(
        GetTableQrCodeByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await (
            from qrCode in _context.TableQrCodes.AsNoTracking()
            join table in _context.RestaurantTables.AsNoTracking()
                on qrCode.RestaurantTableId equals table.Id
            join area in _context.Areas.AsNoTracking()
                on table.AreaId equals area.Id
            where qrCode.Id == request.Id &&
                  table.IsActive &&
                  area.IsActive
            select new TableQrCodeDto
            {
                Id = qrCode.Id,
                RestaurantTableId = qrCode.RestaurantTableId,
                RestaurantTableName = table.Name,
                Token = qrCode.Token,
                QrCodeUrl = qrCode.QrCodeUrl,
                Status = qrCode.Status,
                Note = qrCode.Note,
                IsActive = qrCode.IsActive,
                CreatedAt = qrCode.CreatedAt,
                UpdatedAt = qrCode.UpdatedAt
            }
        ).FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}