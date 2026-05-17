using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Delete;

public class DeleteEmployeeShiftCommandHandler
    : IRequestHandler<DeleteEmployeeShiftCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteEmployeeShiftCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteEmployeeShiftCommand request,
        CancellationToken cancellationToken)
    {
        var employeeShift = await _context.EmployeeShifts
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (employeeShift == null)
        {
            throw new Exception("Không tìm thấy phân công ca.");
        }

        _context.EmployeeShifts.Remove(employeeShift);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}