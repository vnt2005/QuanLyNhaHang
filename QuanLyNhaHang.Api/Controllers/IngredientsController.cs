using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Ingredients.Commands.Create;
using QuanLyNhaHang.Application.Features.Ingredients.Commands.Delete;
using QuanLyNhaHang.Application.Features.Ingredients.Commands.Update;
using QuanLyNhaHang.Application.Features.Ingredients.Queries.GetById;
using QuanLyNhaHang.Application.Features.Ingredients.Queries.GetList;
using QuanLyNhaHang.Application.Features.Ingredients.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/ingredients")]
[Authorize]
public class IngredientsController : ControllerBase
{
    private readonly IMediator _mediator;

    public IngredientsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.InventoryView)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? ingredientCategoryId,
        [FromQuery] bool? isActive,
        [FromQuery] bool? isLowStock)
    {
        var result = await _mediator.Send(new GetIngredientsQuery
        {
            IngredientCategoryId = ingredientCategoryId,
            IsActive = isActive,
            IsLowStock = isLowStock
        });

        return Ok(result);
    }

    [HttpGet("low-stock")]
    [HasPermission(PermissionCodes.InventoryView)]
    public async Task<IActionResult> GetLowStock()
    {
        var result = await _mediator.Send(new GetLowStockIngredientsQuery());

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.InventoryView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] Guid? ingredientCategoryId,
        [FromQuery] bool? isActive,
        [FromQuery] bool? isLowStock,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetIngredientsWithPaginatedListQuery
        {
            Keyword = keyword,
            IngredientCategoryId = ingredientCategoryId,
            IsActive = isActive,
            IsLowStock = isLowStock,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.InventoryView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetIngredientByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy nguyên liệu."
            });

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.InventoryManageCatalog)]
    public async Task<IActionResult> Create([FromBody] CreateIngredientCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo nguyên liệu thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.InventoryManageCatalog)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateIngredientCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật nguyên liệu thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.InventoryManageCatalog)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteIngredientCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Vô hiệu hóa nguyên liệu thành công."
        });
    }
}