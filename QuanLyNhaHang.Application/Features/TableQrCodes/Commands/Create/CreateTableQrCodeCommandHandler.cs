using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Create;

public class CreateTableQrCodeCommandHandler
    : IRequestHandler<CreateTableQrCodeCommand, TableQrCodeDto>
{
    private readonly IApplicationDbContext _context;

    public CreateTableQrCodeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TableQrCodeDto> Handle(
        CreateTableQrCodeCommand request,
        CancellationToken cancellationToken)
    {
        var table = await _context.RestaurantTables
            .WhereOperational(_context)
            .FirstOrDefaultAsync(
                x => x.Id == request.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new InvalidOperationException(
                "Bàn không tồn tại hoặc đã ngừng hoạt động.");
        }

        var qrCode = await _context.TableQrCodes
            .SingleOrDefaultAsync(
                x => x.RestaurantTableId == request.RestaurantTableId,
                cancellationToken);

        if (qrCode != null &&
            (qrCode.IsActive || qrCode.Status != "Inactive"))
        {
            throw new InvalidOperationException("Bàn này đã có mã QR.");
        }

        var token = GenerateToken();
        var qrCodeUrl = GenerateQrCodeUrl(request.ClientBaseUrl, token);

        if (qrCode == null)
        {
            qrCode = new TableQrCode(
                request.RestaurantTableId,
                token,
                qrCodeUrl,
                request.Note);

            await _context.TableQrCodes.AddAsync(
                qrCode,
                cancellationToken);
        }
        else
        {
            // RestaurantTableId has a unique index. Reuse the soft-deleted
            // record so operators can issue a fresh token without violating it.
            qrCode.Regenerate(token, qrCodeUrl, request.Note);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return ToDto(qrCode, table.Name);
    }

    private static TableQrCodeDto ToDto(
        TableQrCode qrCode,
        string restaurantTableName)
    {
        return new TableQrCodeDto
        {
            Id = qrCode.Id,
            RestaurantTableId = qrCode.RestaurantTableId,
            RestaurantTableName = restaurantTableName,
            Token = qrCode.Token,
            QrCodeUrl = qrCode.QrCodeUrl,
            Status = qrCode.Status,
            Note = qrCode.Note,
            IsActive = qrCode.IsActive,
            CreatedAt = qrCode.CreatedAt,
            UpdatedAt = qrCode.UpdatedAt
        };
    }

    private static string GenerateToken()
    {
        return Guid.NewGuid().ToString("N");
    }

    private static string GenerateQrCodeUrl(string? clientBaseUrl, string token)
    {
        var baseUrl = string.IsNullOrWhiteSpace(clientBaseUrl)
            ? "https://localhost:7134"
            : clientBaseUrl.Trim().TrimEnd('/');

        return $"{baseUrl}/qr-order/{token}";
    }
}