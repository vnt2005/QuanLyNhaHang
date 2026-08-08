using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Update;

public class UpdateTableQrCodeCommandHandler
    : IRequestHandler<UpdateTableQrCodeCommand, TableQrCodeDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateTableQrCodeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TableQrCodeDto> Handle(
        UpdateTableQrCodeCommand request,
        CancellationToken cancellationToken)
    {
        var qrCode = await _context.TableQrCodes
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (qrCode == null)
            throw new Exception("Không tìm thấy mã QR.");

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == qrCode.RestaurantTableId, cancellationToken);

        if (table == null)
            throw new Exception("Không tìm thấy bàn.");

        var areaIsActive = await _context.Areas
            .AnyAsync(
                x => x.Id == table.AreaId && x.IsActive,
                cancellationToken);

        if (!table.IsActive || !areaIsActive)
        {
            throw new InvalidOperationException(
                "Bàn không tồn tại hoặc đã ngừng hoạt động.");
        }

        if (request.Regenerate)
        {
            var newToken = GenerateToken();
            var newQrCodeUrl = GenerateQrCodeUrl(request.ClientBaseUrl, newToken);

            qrCode.Regenerate(
                newToken,
                newQrCodeUrl,
                request.Note);
        }
        else
        {
            qrCode.UpdateInfo(request.Note);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            switch (request.Status)
            {
                case "Active":
                    qrCode.Activate();
                    break;

                case "Inactive":
                    qrCode.Deactivate();
                    break;

                case "Blocked":
                    qrCode.Block();
                    break;

                default:
                    throw new Exception("Trạng thái mã QR không hợp lệ.");
            }
        }

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