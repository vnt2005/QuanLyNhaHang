using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetSelectable;

public sealed class GetSelectableRestaurantTablesQueryHandler
    : IRequestHandler<GetSelectableRestaurantTablesQuery, List<RestaurantTableDto>>
{
    private readonly IApplicationDbContext _context;

    public GetSelectableRestaurantTablesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RestaurantTableDto>> Handle(
        GetSelectableRestaurantTablesQuery request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Purpose))
        {
            throw new ArgumentException(
                "Mục đích chọn bàn không được để trống.");
        }

        IQueryable<RestaurantTable> selectableTables =
            _context.RestaurantTables.AsNoTracking();

        selectableTables = request.Purpose.Trim().ToLowerInvariant() switch
        {
            "reservation" => selectableTables.WhereOperational(_context),
            "order" => selectableTables.WhereSelectableForOrder(_context),
            "qrcode" or "qr" => selectableTables.WhereSelectableForQrCode(_context),
            _ => throw new ArgumentException(
                "Mục đích chọn bàn không hợp lệ. Chỉ chấp nhận Reservation, Order hoặc QrCode.")
        };

        return await (
            from table in selectableTables
            join area in _context.Areas.AsNoTracking()
                on table.AreaId equals area.Id
            orderby area.Name, table.Name
            select new RestaurantTableDto
            {
                Id = table.Id,
                AreaId = table.AreaId,
                AreaName = area.Name,
                Name = table.Name,
                Capacity = table.Capacity,
                Status = table.Status,
                Note = table.Note,
                IsActive = table.IsActive,
                CreatedAt = table.CreatedAt,
                UpdatedAt = table.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }
}
