using QuanLyNhaHang.Domain.Entities;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Domain;

public class ShiftTests
{
    [Fact]
    public void Constructor_DayShift_SetsPropertiesCorrectly()
    {
        // Arrange
        var code = "DAY";
        var name = "Ca ngày";
        var start = new TimeSpan(8, 0, 0);
        var end = new TimeSpan(17, 0, 0);

        // Act
        var shift = new Shift(code, name, start, end, "Mô tả ca ngày");

        // Assert
        Assert.Equal(code, shift.ShiftCode);
        Assert.Equal(name, shift.ShiftName);
        Assert.Equal(start, shift.StartTime);
        Assert.Equal(end, shift.EndTime);
        Assert.False(shift.IsOvernight);
        Assert.True(shift.IsActive);
    }

    [Fact]
    public void Constructor_EveningToMidnightShift_InfersOvernightTrue()
    {
        // 17:00 chiều tới 12:00 đêm (00:00:00)
        var start = new TimeSpan(17, 0, 0);
        var end = TimeSpan.Zero; // 00:00:00

        var shift = new Shift("EVENING", "Ca tối", start, end, "5h chiều tới 12h đêm");

        Assert.Equal(start, shift.StartTime);
        Assert.Equal(end, shift.EndTime);
        Assert.True(shift.IsOvernight);
    }

    [Fact]
    public void Constructor_NightShiftAcrossMidnight_InfersOvernightTrue()
    {
        // 22:00 tối tới 05:00 sáng hôm sau
        var start = new TimeSpan(22, 0, 0);
        var end = new TimeSpan(5, 0, 0);

        var shift = new Shift("NIGHT", "Ca khuya", start, end, "10h tối tới 5h sáng");

        Assert.Equal(start, shift.StartTime);
        Assert.Equal(end, shift.EndTime);
        Assert.True(shift.IsOvernight);
    }

    [Fact]
    public void Constructor_SameStartAndEndTime_ThrowsArgumentException()
    {
        var time = new TimeSpan(8, 0, 0);

        var ex = Assert.Throws<ArgumentException>(() =>
            new Shift("SAME", "Ca trùng giờ", time, time, null));

        Assert.Contains("không được trùng nhau", ex.Message);
    }

    [Fact]
    public void Constructor_StartGreaterThanEnd_WhenOvernightExplicitlyDisabled_ThrowsArgumentException()
    {
        var start = new TimeSpan(20, 0, 0);
        var end = new TimeSpan(4, 0, 0);

        var ex = Assert.Throws<ArgumentException>(() =>
            new Shift("FAIL", "Ca sai", start, end, null, isOvernight: false));

        Assert.Contains("nhỏ hơn giờ kết thúc", ex.Message);
    }

    [Fact]
    public void UpdateInfo_ChangesToOvernight_Successfully()
    {
        var shift = new Shift("S1", "Ca 1", new TimeSpan(8, 0, 0), new TimeSpan(16, 0, 0), null);
        Assert.False(shift.IsOvernight);

        shift.UpdateInfo("S1", "Ca 1 cập nhật", new TimeSpan(22, 0, 0), new TimeSpan(6, 0, 0), "Chuyển thành ca đêm");

        Assert.True(shift.IsOvernight);
        Assert.Equal(new TimeSpan(22, 0, 0), shift.StartTime);
        Assert.Equal(new TimeSpan(6, 0, 0), shift.EndTime);
    }
}

