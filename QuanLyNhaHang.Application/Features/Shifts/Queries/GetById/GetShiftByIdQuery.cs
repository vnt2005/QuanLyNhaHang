using MediatR;
using QuanLyNhaHang.Application.Features.Shifts.DTOs;

namespace QuanLyNhaHang.Application.Features.Shifts.Queries.GetById;

public record GetShiftByIdQuery(Guid Id) : IRequest<ShiftDto?>;