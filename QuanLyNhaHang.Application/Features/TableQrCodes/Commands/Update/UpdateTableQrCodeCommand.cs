using MediatR;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Update;

public class UpdateTableQrCodeCommand : IRequest<TableQrCodeDto>
{
    public Guid Id { get; set; }

    public string? Status { get; set; }

    public string? Note { get; set; }

    public bool Regenerate { get; set; }

    public string? ClientBaseUrl { get; set; }
}