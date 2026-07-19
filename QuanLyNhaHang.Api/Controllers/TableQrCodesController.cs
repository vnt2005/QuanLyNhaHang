using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Create;
using QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Delete;
using QuanLyNhaHang.Application.Features.TableQrCodes.Commands.Update;
using QuanLyNhaHang.Application.Features.TableQrCodes.Queries.GetById;
using QuanLyNhaHang.Application.Features.TableQrCodes.Queries.GetList;
using QuanLyNhaHang.Application.Features.TableQrCodes.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/table-qr-codes")]
[Authorize]
public class TableQrCodesController : ControllerBase
{
    private readonly IMediator _mediator;

    public TableQrCodesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.TablesView)]
    public async Task<IActionResult> GetList(
        [FromQuery] string? status,
        [FromQuery] bool? isActive)
    {
        var result = await _mediator.Send(new GetTableQrCodesQuery
        {
            Status = status,
            IsActive = isActive
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.TablesView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetTableQrCodeByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy mã QR."
            });

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.TablesView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] string? status,
        [FromQuery] bool? isActive,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetTableQrCodesWithPaginatedListQuery
        {
            Keyword = keyword,
            Status = status,
            IsActive = isActive,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.TablesManage)]
    public async Task<IActionResult> Create([FromBody] CreateTableQrCodeCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo mã QR cho bàn thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.TablesManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateTableQrCodeCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật mã QR thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.TablesManage)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteTableQrCodeCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Vô hiệu hóa mã QR thành công."
        });
    }
}