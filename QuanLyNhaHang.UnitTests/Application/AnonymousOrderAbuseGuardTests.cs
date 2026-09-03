using QuanLyNhaHang.Application.Common.Orders;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class AnonymousOrderAbuseGuardTests
{
    [Fact]
    public void FifthDeviceAttemptWithinWindow_BlocksDeviceAndIpForThirtyMinutes()
    {
        var guard = new AnonymousOrderAbuseGuard();
        var start = new DateTime(2026, 9, 4, 0, 0, 0, DateTimeKind.Utc);

        for (var index = 0; index < 4; index++)
        {
            var allowed = guard.RegisterAttempt(
                "203.0.113.10",
                "device-test-001",
                $"request-{index}",
                start.AddSeconds(index));
            Assert.False(allowed.IsBlocked);
        }

        var blocked = guard.RegisterAttempt(
            "203.0.113.10",
            "device-test-001",
            "request-4",
            start.AddSeconds(4));

        Assert.True(blocked.IsBlocked);
        Assert.Equal(TimeSpan.FromMinutes(30), blocked.RetryAfter);

        var sameIpDifferentDevice = guard.RegisterAttempt(
            "203.0.113.10",
            "device-test-002",
            "request-other-device",
            start.AddMinutes(1));

        Assert.True(sameIpDifferentDevice.IsBlocked);
        Assert.True(sameIpDifferentDevice.RetryAfter > TimeSpan.FromMinutes(28));
    }

    [Fact]
    public void ReplayedIdempotencyKey_DoesNotIncreaseAttemptCounter()
    {
        var guard = new AnonymousOrderAbuseGuard();
        var start = new DateTime(2026, 9, 4, 0, 0, 0, DateTimeKind.Utc);

        for (var index = 0; index < 20; index++)
        {
            var decision = guard.RegisterAttempt(
                "203.0.113.11",
                "device-test-003",
                "same-request-key",
                start.AddSeconds(index));

            Assert.False(decision.IsBlocked);
        }
    }

    [Fact]
    public void RotatingDeviceIds_EventuallyBlocksSharedIp()
    {
        var guard = new AnonymousOrderAbuseGuard();
        var start = new DateTime(2026, 9, 4, 0, 0, 0, DateTimeKind.Utc);
        AnonymousOrderAbuseDecision last = default;

        for (var index = 0; index < CustomerOrderLimits.AnonymousIpOrderAttemptThreshold; index++)
        {
            last = guard.RegisterAttempt(
                "203.0.113.12",
                $"rotating-device-{index:00}",
                $"rotating-request-{index:00}",
                start.AddSeconds(index));
        }

        Assert.True(last.IsBlocked);
        Assert.Equal(TimeSpan.FromMinutes(30), last.RetryAfter);
    }

    [Fact]
    public void ExpiredBlock_AllowsNewAttempt()
    {
        var guard = new AnonymousOrderAbuseGuard();
        var start = new DateTime(2026, 9, 4, 0, 0, 0, DateTimeKind.Utc);

        for (var index = 0; index < CustomerOrderLimits.AnonymousDeviceOrderAttemptThreshold; index++)
        {
            guard.RegisterAttempt(
                "203.0.113.13",
                "device-test-004",
                $"request-{index}",
                start.AddSeconds(index));
        }

        var afterCooldown = guard.RegisterAttempt(
            "203.0.113.13",
            "device-test-004",
            "request-after-cooldown",
            start.AddMinutes(31));

        Assert.False(afterCooldown.IsBlocked);
    }
}
