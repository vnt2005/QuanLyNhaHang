using QuanLyNhaHang.Domain.Entities;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Domain;

public sealed class OrderTests
{
    [Fact]
    public void AssignCustomer_SetsCustomerAndIsIdempotent()
    {
        var order = CreateOrder();
        var customerUserId = Guid.NewGuid();

        order.AssignCustomer(customerUserId);
        order.AssignCustomer(customerUserId);

        Assert.Equal(customerUserId, order.CustomerUserId);
        Assert.NotNull(order.UpdatedAt);
    }

    [Fact]
    public void AssignCustomer_RejectsInvalidOrDifferentCustomer()
    {
        var order = CreateOrder();
        var customerUserId = Guid.NewGuid();
        order.AssignCustomer(customerUserId);

        Assert.Throws<ArgumentException>(() =>
            CreateOrder().AssignCustomer(Guid.Empty));
        Assert.Throws<InvalidOperationException>(() =>
            order.AssignCustomer(Guid.NewGuid()));
        Assert.Equal(customerUserId, order.CustomerUserId);
    }

    private static Order CreateOrder()
    {
        return new Order(
            Guid.NewGuid(),
            $"ORD-{Guid.NewGuid():N}",
            null);
    }
}

