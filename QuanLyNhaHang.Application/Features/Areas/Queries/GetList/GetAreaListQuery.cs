using MediatR;
using QuanLyNhaHang.Application.Features.Areas.DTOs;

namespace QuanLyNhaHang.Application.Features.Areas.Queries.GetList;

public class GetAreaListQuery : IRequest<List<AreaDto>>
{
}