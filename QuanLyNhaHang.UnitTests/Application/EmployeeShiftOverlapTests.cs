using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Create;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class EmployeeShiftOverlapTests
{
    private static Employee CreateTestEmployee(string code, string ten)
    {
        return new Employee(
            Guid.NewGuid(),
            code,
            "Nguyễn",
            ten,
            $"{code.ToLower()}@test.com",
            "0900000001",
            new DateTime(1995, 1, 1),
            "Địa chỉ",
            "Nhân viên",
            10_000_000m,
            DateTime.UtcNow);
    }

    [Fact]
    public async Task Handle_OverlappingShifts_ThrowsException()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"employee-shift-{Guid.NewGuid()}")
            .Options;

        await using var context = new ApplicationDbContext(options);

        var employee = CreateTestEmployee("NV01", "Văn A");
        var dayShift = new Shift("DAY", "Ca ngày", new TimeSpan(8, 0, 0), new TimeSpan(17, 0, 0), null);
        var overlapShift = new Shift("MID", "Ca trưa chiều", new TimeSpan(12, 0, 0), new TimeSpan(20, 0, 0), null);

        var workDate = new DateTime(2026, 10, 30);
        var existingAssignment = new EmployeeShift(employee.Id, dayShift.Id, workDate, null);

        context.AddRange(employee, dayShift, overlapShift, existingAssignment);
        await context.SaveChangesAsync();

        var handler = new CreateEmployeeShiftCommandHandler(context);

        var command = new CreateEmployeeShiftCommand
        {
            EmployeeId = employee.Id,
            ShiftId = overlapShift.Id,
            WorkDate = workDate,
            Note = "Trùng giờ"
        };

        var ex = await Assert.ThrowsAsync<Exception>(() => handler.Handle(command, CancellationToken.None));
        Assert.Contains("Trùng giờ làm việc", ex.Message);
    }

    [Fact]
    public async Task Handle_OvernightShiftOverlapNextMorning_ThrowsException()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"employee-shift-overnight-{Guid.NewGuid()}")
            .Options;

        await using var context = new ApplicationDbContext(options);

        var employee = CreateTestEmployee("NV02", "Văn B");
        // Ca đêm từ 22:00 ngày 30/10 đến 05:00 sáng ngày 31/10
        var nightShift = new Shift("NIGHT", "Ca khuya", new TimeSpan(22, 0, 0), new TimeSpan(5, 0, 0), null, isOvernight: true);
        // Ca sáng sớm ngày 31/10 từ 04:00 đến 12:00 (bị trùng 1 tiếng từ 04:00 đến 05:00 sáng)
        var earlyMorningShift = new Shift("EARLY", "Ca sáng sớm", new TimeSpan(4, 0, 0), new TimeSpan(12, 0, 0), null, isOvernight: false);

        var nightDate = new DateTime(2026, 10, 30);
        var existingAssignment = new EmployeeShift(employee.Id, nightShift.Id, nightDate, null);

        context.AddRange(employee, nightShift, earlyMorningShift, existingAssignment);
        await context.SaveChangesAsync();

        var handler = new CreateEmployeeShiftCommandHandler(context);

        // Phân ca sáng sớm ngày 31/10
        var command = new CreateEmployeeShiftCommand
        {
            EmployeeId = employee.Id,
            ShiftId = earlyMorningShift.Id,
            WorkDate = new DateTime(2026, 10, 31),
            Note = "Ca sáng hôm sau"
        };

        var ex = await Assert.ThrowsAsync<Exception>(() => handler.Handle(command, CancellationToken.None));
        Assert.Contains("Trùng giờ làm việc", ex.Message);
    }

    [Fact]
    public async Task Handle_NonOverlappingShifts_Succeeds()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"employee-shift-ok-{Guid.NewGuid()}")
            .Options;

        await using var context = new ApplicationDbContext(options);

        var employee = CreateTestEmployee("NV03", "Thị C");
        var morningShift = new Shift("MORNING", "Ca sáng", new TimeSpan(6, 0, 0), new TimeSpan(14, 0, 0), null);
        var eveningShift = new Shift("EVENING", "Ca tối", new TimeSpan(17, 0, 0), new TimeSpan(23, 0, 0), null);

        var workDate = new DateTime(2026, 10, 30);
        var existingAssignment = new EmployeeShift(employee.Id, morningShift.Id, workDate, null);

        context.AddRange(employee, morningShift, eveningShift, existingAssignment);
        await context.SaveChangesAsync();

        var handler = new CreateEmployeeShiftCommandHandler(context);

        var command = new CreateEmployeeShiftCommand
        {
            EmployeeId = employee.Id,
            ShiftId = eveningShift.Id,
            WorkDate = workDate,
            Note = "Không trùng"
        };

        var result = await handler.Handle(command, CancellationToken.None);
        Assert.NotEqual(Guid.Empty, result);
    }
}
