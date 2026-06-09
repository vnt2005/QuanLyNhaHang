using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Queries.GetWithPaginatedList;

public class GetTableQrCodesWithPaginatedListQueryHandler
    : IRequestHandler<GetTableQrCodesWithPaginatedListQuery, PaginatedList<TableQrCodeDto>>
{
    private readonly IApplicationDbContext _context;

    public GetTableQrCodesWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<TableQrCodeDto>> Handle(
        GetTableQrCodesWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from qrCode in _context.TableQrCodes.AsNoTracking()
            join table in _context.RestaurantTables.AsNoTracking()
                on qrCode.RestaurantTableId equals table.Id
            select new
            {
                QrCode = qrCode,
                TableName = table.Name
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.TableName.Contains(keyword) ||
                x.QrCode.Token.Contains(keyword) ||
                x.QrCode.QrCodeUrl.Contains(keyword) ||
                x.QrCode.Status.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.QrCode.Status == request.Status);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.QrCode.IsActive == request.IsActive.Value);
        }

        var qrCodeDtos = query
            .OrderByDescending(x => x.QrCode.CreatedAt)
            .Select(x => new TableQrCodeDto
            {
                Id = x.QrCode.Id,
                RestaurantTableId = x.QrCode.RestaurantTableId,
                RestaurantTableName = x.TableName,
                Token = x.QrCode.Token,
                QrCodeUrl = x.QrCode.QrCodeUrl,
                Status = x.QrCode.Status,
                Note = x.QrCode.Note,
                IsActive = x.QrCode.IsActive,
                CreatedAt = x.QrCode.CreatedAt,
                UpdatedAt = x.QrCode.UpdatedAt
            });

        return await PaginatedList<TableQrCodeDto>.CreateAsync(
            qrCodeDtos,
            request.PageNumber,
            request.PageSize);
    }
}