using MediatR;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Create;
using QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Delete;
using QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Update;
using QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetById;
using QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetList;
using QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/ingredient-categories")]
public class IngredientCategoriesController : ControllerBase
{
    private readonly IMediator _mediator;

    public IngredientCategoriesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] bool? isActive)
    {
        var result = await _mediator.Send(new GetIngredientCategoriesQuery
        {
            IsActive = isActive
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] bool? isActive,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetIngredientCategoriesWithPaginatedListQuery
        {
            Keyword = keyword,
            IsActive = isActive,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetIngredientCategoryByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy danh mục nguyên liệu."
            });

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIngredientCategoryCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo danh mục nguyên liệu thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateIngredientCategoryCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật danh mục nguyên liệu thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteIngredientCategoryCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Vô hiệu hóa danh mục nguyên liệu thành công."
        });
    }
}