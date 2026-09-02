using Microsoft.EntityFrameworkCore;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
    private async Task<object> GetUsersModuleAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var roleBreakdown = await _dbContext.Users
            .AsNoTracking()
            .GroupBy(item => item.Role)
            .Select(group => new
            {
                role = group.Key,
                count = group.Count(),
                active = group.Count(item => item.IsActive)
            })
            .OrderByDescending(item => item.count)
            .ToListAsync(cancellationToken);

        var totalCount = await _dbContext.Users.CountAsync(cancellationToken);
        var recent = await _dbContext.Users
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.Id,
                item.Ho,
                item.Ten,
                item.Email,
                item.PhoneNumber,
                item.Role,
                item.IsActive,
                item.IsEmailVerified,
                item.TwoFactorEnabled,
                item.CreatedAt,
                item.LoginLockedUntil
            })
            .ToListAsync(cancellationToken);

        return new
        {
            totalCount,
            returnedCount = recent.Count,
            hasMore = totalCount > recent.Count,
            roleBreakdown,
            recent,
            excludedFields = new[] { "PasswordHash", "verification/reset/2FA codes" }
        };
    }

    private async Task<object> GetEmployeesModuleAsync(
        string query,
        int limit,
        CancellationToken cancellationToken)
    {
        var employees = await _dbContext.Employees
            .AsNoTracking()
            .OrderBy(item => item.EmployeeCode)
            .ToListAsync(cancellationToken);

        var matchingEmployees = employees
            .Where(item => string.IsNullOrWhiteSpace(query)
                || item.EmployeeCode.Contains(query, StringComparison.OrdinalIgnoreCase)
                || item.Ten.Contains(query, StringComparison.OrdinalIgnoreCase)
                || (!string.IsNullOrWhiteSpace(item.Ho) && item.Ho.Contains(query, StringComparison.OrdinalIgnoreCase))
                || item.Position.Contains(query, StringComparison.OrdinalIgnoreCase))
            .ToList();
        var filtered = matchingEmployees
            .Take(limit)
            .Select(item => new
            {
                item.EmployeeCode,
                fullName = string.Join(' ', new[] { item.Ho, item.Ten }.Where(part => !string.IsNullOrWhiteSpace(part))),
                item.Email,
                item.PhoneNumber,
                item.Position,
                item.BaseSalary,
                item.HireDate,
                item.IsActive
            })
            .ToList();

        return new
        {
            totalCount = matchingEmployees.Count,
            returnedCount = filtered.Count,
            hasMore = matchingEmployees.Count > filtered.Count,
            employees = filtered
        };
    }

    private async Task<object> GetShiftsModuleAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var shifts = await _dbContext.Shifts
            .AsNoTracking()
            .OrderBy(item => item.StartTime)
            .Select(item => new
            {
                item.Id,
                item.ShiftCode,
                item.ShiftName,
                item.StartTime,
                item.EndTime,
                item.IsActive
            })
            .ToListAsync(cancellationToken);

        var from = DateTime.UtcNow.Date.AddDays(-1);
        var to = from.AddDays(9);
        var assignmentsQuery = _dbContext.EmployeeShifts
            .AsNoTracking()
            .Where(item => item.IsActive && item.WorkDate >= from && item.WorkDate < to);
        var totalAssignmentCount = await assignmentsQuery.CountAsync(cancellationToken);
        var assignments = await assignmentsQuery
            .OrderBy(item => item.WorkDate)
            .Take(limit)
            .Select(item => new
            {
                item.EmployeeId,
                item.ShiftId,
                item.WorkDate,
                item.Note
            })
            .ToListAsync(cancellationToken);

        var employeeIds = assignments.Select(item => item.EmployeeId).Distinct().ToArray();
        var employees = employeeIds.Length == 0
            ? new Dictionary<Guid, string>()
            : await _dbContext.Employees
                .AsNoTracking()
                .Where(item => employeeIds.Contains(item.Id))
                .ToDictionaryAsync(
                    item => item.Id,
                    item => (item.Ho == null ? string.Empty : item.Ho + " ") + item.Ten,
                    cancellationToken);
        var shiftNames = shifts.ToDictionary(item => item.Id, item => item.ShiftName);

        return new
        {
            totalShifts = shifts.Count,
            shifts = shifts.Select(item => new
            {
                item.ShiftCode,
                item.ShiftName,
                item.StartTime,
                item.EndTime,
                item.IsActive
            }),
            assignments = new
            {
                totalCount = totalAssignmentCount,
                returnedCount = assignments.Count,
                hasMore = totalAssignmentCount > assignments.Count,
                items = assignments.Select(item => new
                {
                    employee = employees.TryGetValue(item.EmployeeId, out var employee)
                        ? employee
                        : item.EmployeeId.ToString(),
                    shift = shiftNames.TryGetValue(item.ShiftId, out var shift)
                        ? shift
                        : item.ShiftId.ToString(),
                    item.WorkDate,
                    item.Note
                })
            }
        };
    }
}
