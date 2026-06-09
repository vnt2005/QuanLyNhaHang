using MediatR;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Create;

public class CreateTableQrCodeCommand : IRequest<TableQrCodeDto>
{
    public Guid RestaurantTableId { get; set; }

    public string? ClientBaseUrl { get; set; }

    public string? Note { get; set; }
}