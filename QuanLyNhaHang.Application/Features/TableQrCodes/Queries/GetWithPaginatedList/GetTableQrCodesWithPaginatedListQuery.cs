using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.TableQrCodes.DTOs;

namespace QuanLyNhaHang.Application.Features.TableQrCodes.Queries.GetWithPaginatedList;

public class GetTableQrCodesWithPaginatedListQuery : IRequest<PaginatedList<TableQrCodeDto>>
{
    public string? Keyword { get; set; }

    public string? Status { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}