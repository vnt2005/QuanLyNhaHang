using MediatR;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Delete;

public class DeleteTableQrCodeCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}