using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Users.Commands.Delete;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class DeleteUserCommandHandlerTests
{
    [Fact]
    public async Task Handle_CurrentUser_RejectsSelfDeletion()
    {
        await using var context = CreateContext();
        var currentUser = CreateUser("current@example.com", "0900000001", "Admin");
        context.Users.Add(currentUser);
        await context.SaveChangesAsync();

        var handler = new DeleteUserCommandHandler(
            context,
            new StubCurrentUserService(currentUser.Id));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(
                new DeleteUserCommand(currentUser.Id),
                CancellationToken.None));

        Assert.Equal(
            "Không thể xóa chính tài khoản đang đăng nhập.",
            exception.Message);
        Assert.True(await context.Users.AnyAsync(x => x.Id == currentUser.Id));
    }

    [Fact]
    public async Task Handle_LastActiveAdmin_RejectsDeletion()
    {
        await using var context = CreateContext();
        var currentUser = CreateUser("manager@example.com", "0900000002", "Manager");
        var lastAdmin = CreateUser("admin@example.com", "0900000003", "Admin");
        context.Users.AddRange(currentUser, lastAdmin);
        await context.SaveChangesAsync();

        var handler = new DeleteUserCommandHandler(
            context,
            new StubCurrentUserService(currentUser.Id));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.Handle(
                new DeleteUserCommand(lastAdmin.Id),
                CancellationToken.None));

        Assert.Equal(
            "Không thể xóa Admin đang hoạt động cuối cùng của hệ thống.",
            exception.Message);
        Assert.True(await context.Users.AnyAsync(x => x.Id == lastAdmin.Id));
    }

    [Fact]
    public async Task Handle_OtherAccount_DeletesUser()
    {
        await using var context = CreateContext();
        var currentAdmin = CreateUser("admin1@example.com", "0900000004", "Admin");
        var secondAdmin = CreateUser("admin2@example.com", "0900000005", "Admin");
        var staff = CreateUser("staff@example.com", "0900000006", "Staff");
        context.Users.AddRange(currentAdmin, secondAdmin, staff);
        await context.SaveChangesAsync();

        var handler = new DeleteUserCommandHandler(
            context,
            new StubCurrentUserService(currentAdmin.Id));

        var result = await handler.Handle(
            new DeleteUserCommand(staff.Id),
            CancellationToken.None);

        Assert.True(result);
        Assert.False(await context.Users.AnyAsync(x => x.Id == staff.Id));
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"delete-user-{Guid.NewGuid()}")
            .Options;
        return new ApplicationDbContext(options);
    }

    private static User CreateUser(string email, string phoneNumber, string role)
    {
        return new User(
            "Nguyễn",
            "Văn A",
            email,
            phoneNumber,
            "hashed-password",
            role);
    }

    private sealed class StubCurrentUserService : ICurrentUserService
    {
        public StubCurrentUserService(Guid? userId)
        {
            UserId = userId;
        }

        public Guid? UserId { get; }
        public Guid? SessionId => null;
        public string? UserName => null;
        public string? IpAddress => null;
        public string? UserAgent => null;
    }
}
