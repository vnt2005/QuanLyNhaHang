using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Employees.Commands.Delete;

public class DeleteEmployeeCommandHandler
    : IRequestHandler<DeleteEmployeeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteEmployeeCommandHandler(
        IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteEmployeeCommand request,
        CancellationToken cancellationToken)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(
                x => x.Id == request.Id,
                cancellationToken);

        if (employee == null)
            throw new Exception("Không tìm thấy nhân viên.");

        employee.Deactivate();

        if (employee.UserId.HasValue)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(
                    x => x.Id == employee.UserId.Value,
                    cancellationToken);

            user?.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}