using MediatR;
using QuanLyNhaHang.Application.Features.Shifts.DTOs;

namespace QuanLyNhaHang.Application.Features.Shifts.Queries.GetList;

public record GetShiftListQuery : IRequest<List<ShiftDto>>;