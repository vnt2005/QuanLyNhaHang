using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
    private async Task<object> GetRestaurantInfoAsync(CancellationToken cancellationToken)
    {
        var setting = await _dbContext.RestaurantSettings
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .Select(item => new
            {
                item.RestaurantName,
                item.Address,
                item.PhoneNumber,
                item.Email,
                item.WebsiteUrl,
                item.OpeningTime,
                item.ClosingTime,
                item.DefaultVatPercent,
                item.ServiceChargePercent,
                item.Currency,
                item.QrOrderWelcomeMessage
            })
            .FirstOrDefaultAsync(cancellationToken);

        var areas = await _dbContext.Areas
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderBy(item => item.Name)
            .Select(item => new { item.Id, item.Name, item.Description })
            .ToListAsync(cancellationToken);

        var tables = await _dbContext.RestaurantTables
            .AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => new
            {
                item.AreaId,
                item.Name,
                item.Capacity,
                item.Status
            })
            .ToListAsync(cancellationToken);

        var areaNames = areas.ToDictionary(item => item.Id, item => item.Name);
        var tableSummary = tables
            .GroupBy(item => item.Status)
            .ToDictionary(group => group.Key, group => group.Count());

        return new
        {
            restaurant = setting,
            areas = areas.Select(item => new
            {
                item.Name,
                item.Description,
                tableCount = tables.Count(table => table.AreaId == item.Id),
                availableNow = tables.Count(table => table.AreaId == item.Id && table.Status == "Available")
            }),
            tableStatus = tableSummary,
            availableTables = tables
                .Where(item => item.Status == "Available")
                .OrderBy(item => item.Capacity)
                .Take(20)
                .Select(item => new
                {
                    area = areaNames.TryGetValue(item.AreaId, out var areaName) ? areaName : "Khác",
                    item.Name,
                    item.Capacity
                })
        };
    }

    private async Task<object> GetTableAvailabilityAsync(
        JsonElement args,
        CancellationToken cancellationToken)
    {
        var guests = Math.Clamp(AiToolArguments.GetInt(args, "guests", 1), 1, 100);
        var requestedAt = AiToolArguments.GetDateTime(args, "at");

        var areas = await _dbContext.Areas
            .AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => new { item.Id, item.Name })
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);

        var tables = await _dbContext.RestaurantTables
            .AsNoTracking()
            .Where(item => item.IsActive && item.Capacity >= guests)
            .OrderBy(item => item.Capacity)
            .ToListAsync(cancellationToken);

        HashSet<Guid> conflictingTableIds = [];
        if (requestedAt.HasValue)
        {
            var from = requestedAt.Value.AddMinutes(-90);
            var to = requestedAt.Value.AddMinutes(90);
            conflictingTableIds = await _dbContext.Reservations
                .AsNoTracking()
                .Where(item => (item.Status == "Pending" || item.Status == "Confirmed")
                    && item.ReservationTime >= from
                    && item.ReservationTime <= to)
                .Select(item => item.RestaurantTableId)
                .ToHashSetAsync(cancellationToken);
        }

        var candidates = tables
            .Where(item => requestedAt.HasValue
                ? !conflictingTableIds.Contains(item.Id)
                : item.Status == "Available")
            .Take(20)
            .Select(item => new
            {
                area = areas.TryGetValue(item.AreaId, out var areaName) ? areaName : "Khác",
                item.Name,
                item.Capacity,
                currentStatus = item.Status
            })
            .ToList();

        return new
        {
            guests,
            requestedAt,
            candidateCount = candidates.Count,
            candidates,
            note = "Đây là dữ liệu tham khảo tại thời điểm hỏi. Khách vẫn phải gửi yêu cầu ở trang Đặt bàn để hệ thống kiểm tra/xác nhận theo luồng nghiệp vụ."
        };
    }

    private static object GetWebsiteCapabilities()
    {
        return new
        {
            pages = new[]
            {
                new { name = "Trang chủ", purpose = "Xem thông tin nhà hàng và món nổi bật." },
                new { name = "Thực đơn", purpose = "Xem món, giá và tình trạng đang bán." },
                new { name = "Mang về", purpose = "Chọn món, tạo đơn mang về và theo dõi trạng thái." },
                new { name = "Đặt bàn", purpose = "Gửi yêu cầu đặt bàn theo thời gian và số khách." },
                new { name = "Đơn của tôi", purpose = "Khách đăng nhập xem đơn thuộc tài khoản, trạng thái bếp và thanh toán." },
                new { name = "Đăng nhập/Tài khoản", purpose = "Quản lý phiên khách hàng và thông tin tài khoản." }
            },
            rules = new[]
            {
                "AI chỉ tư vấn và đọc dữ liệu; AI không tự bấm đặt món, hủy đơn, thanh toán hay đặt bàn.",
                "Dữ liệu riêng như đơn hàng/thông báo chỉ được đọc khi đúng tài khoản Customer đang đăng nhập."
            }
        };
    }
}
