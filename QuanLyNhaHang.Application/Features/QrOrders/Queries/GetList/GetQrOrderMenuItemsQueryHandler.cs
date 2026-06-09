using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.QrOrders.Queries.GetList;

public class GetQrOrderMenuItemsQueryHandler
    : IRequestHandler<GetQrOrderMenuItemsQuery, List<QrOrderMenuItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetQrOrderMenuItemsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<QrOrderMenuItemDto>> Handle(
        GetQrOrderMenuItemsQuery request,
        CancellationToken cancellationToken)
    {
        var token = request.Token.Trim();

        var qrCode = await _context.TableQrCodes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Token == token, cancellationToken);

        if (qrCode == null)
            throw new Exception("Mã QR không hợp lệ.");

        if (!qrCode.IsActive || qrCode.Status != "Active")
            throw new Exception("Mã QR đã bị vô hiệu hóa.");

        var menuItems = await _context.MenuItems
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new QrOrderMenuItemDto
            {
                Id = x.Id,
                Name = x.Name,
                Price = x.Price
            })
            .ToListAsync(cancellationToken);

        return menuItems;
    }
}