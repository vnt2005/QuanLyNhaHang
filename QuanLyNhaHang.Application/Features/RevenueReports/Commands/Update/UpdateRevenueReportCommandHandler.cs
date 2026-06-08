using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RevenueReports.DTOs;

namespace QuanLyNhaHang.Application.Features.RevenueReports.Commands.Update;

public class UpdateRevenueReportCommandHandler
    : IRequestHandler<UpdateRevenueReportCommand, RevenueReportDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateRevenueReportCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RevenueReportDto> Handle(
        UpdateRevenueReportCommand request,
        CancellationToken cancellationToken)
    {
        var report = await _context.RevenueReports
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (report == null)
            throw new Exception("Không tìm thấy báo cáo doanh thu.");

        report.UpdateNote(request.Note);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            switch (request.Status)
            {
                case "Generated":
                    break;

                case "Exported":
                    report.MarkExported();
                    break;

                case "Printed":
                    report.MarkPrinted();
                    break;

                case "Cancelled":
                    report.Cancel();
                    break;

                default:
                    throw new Exception("Trạng thái báo cáo không hợp lệ.");
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new RevenueReportDto
        {
            Id = report.Id,
            ReportCode = report.ReportCode,
            FromDate = report.FromDate,
            ToDate = report.ToDate,
            TotalInvoices = report.TotalInvoices,
            TotalOrders = report.TotalOrders,
            TotalAmount = report.TotalAmount,
            TotalDiscountAmount = report.TotalDiscountAmount,
            TotalVatAmount = report.TotalVatAmount,
            TotalRevenue = report.TotalRevenue,
            TotalCustomerPaid = report.TotalCustomerPaid,
            TotalChangeAmount = report.TotalChangeAmount,
            AverageRevenuePerInvoice = report.AverageRevenuePerInvoice,
            Status = report.Status,
            Note = report.Note,
            GeneratedAt = report.GeneratedAt,
            CreatedAt = report.CreatedAt,
            UpdatedAt = report.UpdatedAt
        };
    }
}