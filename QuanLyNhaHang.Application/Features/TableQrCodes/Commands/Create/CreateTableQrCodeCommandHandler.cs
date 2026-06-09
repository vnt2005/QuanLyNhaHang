using MediatR;
using Microsoft.EntityFrameworkCore;
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
            .FirstOrDefaultAsync(x => x.Id == request.RestaurantTableId, cancellationToken);

        if (table == null)
            throw new Exception("Không tìm thấy bàn.");

        var existedQrCode = await _context.TableQrCodes
            .AnyAsync(x => x.RestaurantTableId == request.RestaurantTableId, cancellationToken);

        if (existedQrCode)
            throw new Exception("Bàn này đã có mã QR.");

        var token = GenerateToken();
        var qrCodeUrl = GenerateQrCodeUrl(request.ClientBaseUrl, token);

        var qrCode = new TableQrCode(
            request.RestaurantTableId,
            token,
            qrCodeUrl,
            request.Note);

        await _context.TableQrCodes.AddAsync(qrCode, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new TableQrCodeDto
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