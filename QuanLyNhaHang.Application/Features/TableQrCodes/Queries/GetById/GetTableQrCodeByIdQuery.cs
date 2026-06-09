using MediatR;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Queries.GetById;

public class GetTableQrCodeByIdQuery : IRequest<TableQrCodeDto?>
{
    public Guid Id { get; set; }
}