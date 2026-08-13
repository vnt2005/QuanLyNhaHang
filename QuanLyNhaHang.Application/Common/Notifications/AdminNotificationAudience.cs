using QuanLyNhaHang.Application.Common.Constants;

namespace QuanLyNhaHang.Application.Common.Notifications;

public static class AdminNotificationAudience
{
    public static IReadOnlyCollection<string> OrderAndReservationRoles { get; } =
        Array.AsReadOnly(new[]
        {
            SystemRoles.Admin,
            SystemRoles.Manager,
            SystemRoles.Cashier,
            SystemRoles.Staff
        });
}
