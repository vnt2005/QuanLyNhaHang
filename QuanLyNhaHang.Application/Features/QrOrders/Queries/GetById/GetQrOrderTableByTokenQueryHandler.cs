using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.QrOrders.Queries.GetById;

public class GetQrOrderTableByTokenQueryHandler
    : IRequestHandler<GetQrOrderTableByTokenQuery, QrOrderTableDto?>
{
    private readonly IApplicationDbContext _context;

    public GetQrOrderTableByTokenQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<QrOrderTableDto?> Handle(
        GetQrOrderTableByTokenQuery request,
        CancellationToken cancellationToken)
    {
        var token = request.Token.Trim();

        var result = await (
            from qrCode in _context.TableQrCodes.AsNoTracking()
            join table in _context.RestaurantTables
                .AsNoTracking()
                .WhereOperational(_context)
                on qrCode.RestaurantTableId equals table.Id
            where qrCode.Token == token &&
                  qrCode.IsActive &&
                  qrCode.Status == "Active"
            select new QrOrderTableDto
            {
                RestaurantTableId = table.Id,
                RestaurantTableName = table.Name,
                TableStatus = table.Status,
                QrStatus = qrCode.Status,
                IsActive = qrCode.IsActive,
                Token = qrCode.Token
            }
        ).FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}