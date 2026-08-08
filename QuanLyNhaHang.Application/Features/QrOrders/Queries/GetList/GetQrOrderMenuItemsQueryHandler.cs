using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
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
            throw new KeyNotFoundException("Mã QR không hợp lệ.");

        if (!qrCode.IsActive || qrCode.Status != "Active")
            throw new InvalidOperationException("Mã QR đã bị vô hiệu hóa.");

        var tableIsAvailable = await _context.RestaurantTables
            .AsNoTracking()
            .WhereOperational(_context)
            .AnyAsync(
                table => table.Id == qrCode.RestaurantTableId,
                cancellationToken);

        if (!tableIsAvailable)
        {
            throw new InvalidOperationException(
                "Bàn không tồn tại hoặc đã ngừng hoạt động.");
        }

        var menuItems = await (
            from menuItem in _context.MenuItems.AsNoTracking()
            join category in _context.MenuCategories.AsNoTracking()
                on menuItem.MenuCategoryId equals category.Id
            where menuItem.IsActive &&
                  menuItem.IsAvailable &&
                  category.IsActive
            orderby category.DisplayOrder, category.Name, menuItem.Name
            select new QrOrderMenuItemDto
            {
                Id = menuItem.Id,
                MenuCategoryId = category.Id,
                MenuCategoryName = category.Name,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Price = menuItem.Price,
                ImageUrl = menuItem.ImageUrl
            })
            .ToListAsync(cancellationToken);

        return menuItems;
    }
}
