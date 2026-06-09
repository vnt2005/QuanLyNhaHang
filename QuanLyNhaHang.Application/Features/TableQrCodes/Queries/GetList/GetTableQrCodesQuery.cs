using MediatR;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Queries.GetList;

public class GetTableQrCodesQuery : IRequest<List<TableQrCodeDto>>
{
    public string? Status { get; set; }

    public bool? IsActive { get; set; }
}