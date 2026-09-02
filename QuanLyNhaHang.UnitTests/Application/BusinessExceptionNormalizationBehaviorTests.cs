using MediatR;
using QuanLyNhaHang.Application.Common.Behaviors;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class BusinessExceptionNormalizationBehaviorTests
{
    [Fact]
    public async Task Handle_GenericNotFoundException_BecomesKeyNotFoundException()
    {
        var behavior = new BusinessExceptionNormalizationBehavior<TestRequest, bool>();

        var exception = await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            behavior.Handle(
                new TestRequest(),
                _ => throw new Exception("Không tìm thấy dữ liệu cần cập nhật."),
                CancellationToken.None));

        Assert.Equal("Không tìm thấy dữ liệu cần cập nhật.", exception.Message);
    }

    [Fact]
    public async Task Handle_GenericBusinessException_BecomesInvalidOperationException()
    {
        var behavior = new BusinessExceptionNormalizationBehavior<TestRequest, bool>();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            behavior.Handle(
                new TestRequest(),
                _ => throw new Exception("Tên dữ liệu đã tồn tại."),
                CancellationToken.None));

        Assert.Equal("Tên dữ liệu đã tồn tại.", exception.Message);
    }

    [Fact]
    public async Task Handle_TypedException_IsNotChanged()
    {
        var behavior = new BusinessExceptionNormalizationBehavior<TestRequest, bool>();
        var expected = new UnauthorizedAccessException("Không được phép.");

        var actual = await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            behavior.Handle(
                new TestRequest(),
                _ => throw expected,
                CancellationToken.None));

        Assert.Same(expected, actual);
    }

    private sealed record TestRequest : IRequest<bool>;
}
