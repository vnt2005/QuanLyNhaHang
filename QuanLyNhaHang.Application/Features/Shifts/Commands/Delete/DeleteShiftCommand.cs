using MediatR;

namespace QuanLyNhaHang.Application.Features.Shifts.Commands.Delete;

public record DeleteShiftCommand(Guid Id) : IRequest<bool>;