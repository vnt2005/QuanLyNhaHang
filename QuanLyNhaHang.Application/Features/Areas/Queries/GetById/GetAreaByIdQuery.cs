using MediatR;
using QuanLyNhaHang.Application.Features.Areas.DTOs;

namespace QuanLyNhaHang.Application.Features.Areas.Queries.GetById;

public class GetAreaByIdQuery : IRequest<AreaDto?>
{
    public Guid Id { get; set; }

    public GetAreaByIdQuery(Guid id)
    {
        Id = id;
    }
}