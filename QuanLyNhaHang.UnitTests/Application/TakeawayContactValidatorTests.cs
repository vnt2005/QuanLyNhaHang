using QuanLyNhaHang.Application.Common.Orders;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class TakeawayContactValidatorTests
{
    [Fact]
    public void NormalizeCustomerName_TrimsWhitespaceAndKeepsVietnameseLetters()
    {
        var result = TakeawayContactValidator.NormalizeCustomerName(
            "  Trần   Thanh   Tâm  ");

        Assert.Equal("Trần Thanh Tâm", result);
    }

    [Theory]
    [InlineData("daskdl")]
    [InlineData("Nguyễn 123")]
    [InlineData("A <script>")]
    public void NormalizeCustomerName_RejectsMalformedNames(string input)
    {
        Assert.Throws<ArgumentException>(() =>
            TakeawayContactValidator.NormalizeCustomerName(input));
    }

    [Theory]
    [InlineData("0912345678", "0912345678")]
    [InlineData("+84 912 345 678", "0912345678")]
    [InlineData("84-912-345-678", "0912345678")]
    public void NormalizeVietnameseMobileNumber_NormalizesSupportedFormats(
        string input,
        string expected)
    {
        Assert.Equal(
            expected,
            TakeawayContactValidator.NormalizeVietnameseMobileNumber(input));
    }

    [Theory]
    [InlineData("0958209735987432542642")]
    [InlineData("0123456789")]
    [InlineData("09123abc78")]
    [InlineData("123")]
    public void NormalizeVietnameseMobileNumber_RejectsInvalidNumbers(string input)
    {
        Assert.Throws<ArgumentException>(() =>
            TakeawayContactValidator.NormalizeVietnameseMobileNumber(input));
    }
}
