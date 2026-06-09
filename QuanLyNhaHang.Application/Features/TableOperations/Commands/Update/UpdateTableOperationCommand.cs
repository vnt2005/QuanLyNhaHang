using MediatR;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Update;

public class UpdateTableOperationCommand : IRequest<TableOperationDto>
{
    public Guid Id { get; set; }

    public string? Note { get; set; }
}