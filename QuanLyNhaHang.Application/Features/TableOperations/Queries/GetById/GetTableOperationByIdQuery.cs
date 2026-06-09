using MediatR;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Queries.GetById;

public class GetTableOperationByIdQuery : IRequest<TableOperationDto?>
{
    public Guid Id { get; set; }
}