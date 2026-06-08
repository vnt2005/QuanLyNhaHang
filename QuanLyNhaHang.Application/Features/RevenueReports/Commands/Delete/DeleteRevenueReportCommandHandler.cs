using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Commands.Delete;

public class DeleteRevenueReportCommandHandler
    : IRequestHandler<DeleteRevenueReportCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRevenueReportCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteRevenueReportCommand request,
        CancellationToken cancellationToken)
    {
        var report = await _context.RevenueReports
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (report == null)
            throw new Exception("Không tìm thấy báo cáo doanh thu.");

        report.Cancel();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}