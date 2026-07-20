using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.RestaurantSettings.Commands.Create;
using QuanLyNhaHang.Application.Features.RestaurantSettings.Commands.Delete;
using QuanLyNhaHang.Application.Features.RestaurantSettings.Commands.Update;
using QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetById;
using QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetList;
using QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/restaurant-settings")]
[Authorize]
public class RestaurantSettingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public RestaurantSettingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.RestaurantSettingsView)]
    public async Task<IActionResult> GetList([FromQuery] bool? isActive)
    {
        var result = await _mediator.Send(new GetRestaurantSettingsQuery
        {
            IsActive = isActive
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.RestaurantSettingsView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] bool? isActive,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetRestaurantSettingsWithPaginatedListQuery
        {
            Keyword = keyword,
            IsActive = isActive,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.RestaurantSettingsView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetRestaurantSettingByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy cài đặt nhà hàng."
            });

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.RestaurantSettingsManage)]
    public async Task<IActionResult> Create([FromBody] CreateRestaurantSettingCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo cài đặt nhà hàng thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.RestaurantSettingsManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateRestaurantSettingCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật cài đặt nhà hàng thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.RestaurantSettingsManage)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteRestaurantSettingCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Vô hiệu hóa cài đặt nhà hàng thành công."
        });
    }
}
