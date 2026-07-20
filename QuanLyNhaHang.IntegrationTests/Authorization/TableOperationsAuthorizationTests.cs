using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Api.Authorization;
using QuanLyNhaHang.Api.Controllers;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class TableOperationsAuthorizationTests
{
    [Theory]
    [InlineData(SystemRoles.Manager, true)]
    [InlineData(SystemRoles.Cashier, true)]
    [InlineData(SystemRoles.Staff, true)]
    [InlineData(SystemRoles.Kitchen, false)]
    public async Task DefaultEmployeeRoles_ReceiveLeastPrivilegeReadAccess(
        string role,
        bool isAllowed)
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, client, role);

        using var response = await client.GetAsync("/api/table-operations");

        Assert.Equal(
            isAllowed
                ? HttpStatusCode.OK
                : HttpStatusCode.Forbidden,
            response.StatusCode);
    }

    [Fact]
    public async Task Cashier_CannotTransferMergeOrSplitTables()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, client, SystemRoles.Cashier);

        foreach (var endpoint in new[]
                 {
                     "/api/table-operations/transfer",
                     "/api/table-operations/merge",
                     "/api/table-operations/split"
                 })
        {
            using var response = await client.PostAsJsonAsync(endpoint, new { });
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    [Fact]
    public async Task Staff_CanUpdateNoteButCannotCancelOperation()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, client, SystemRoles.Staff);
        var operationId = await SeedOperationAsync(factory);

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/table-operations/{operationId}",
            new { note = "Ghi chú đã cập nhật" });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        using var deleteResponse = await client.DeleteAsync(
            $"/api/table-operations/{operationId}");

        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);

        var operation = await GetOperationAsync(factory, operationId);
        Assert.Equal("Ghi chú đã cập nhật", operation.Note);
        Assert.Equal("Completed", operation.Status);
    }

    [Fact]
    public async Task Manager_CanCancelOperation()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, client, SystemRoles.Manager);
        var operationId = await SeedOperationAsync(factory);

        using var response = await client.DeleteAsync(
            $"/api/table-operations/{operationId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var operation = await GetOperationAsync(factory, operationId);
        Assert.Equal("Cancelled", operation.Status);
    }

    [Fact]
    public void TableOperationActions_RequireExpectedPermissions()
    {
        AssertPermission(
            nameof(TableOperationsController.GetList),
            PermissionCodes.TableOperationsView);
        AssertPermission(
            nameof(TableOperationsController.GetById),
            PermissionCodes.TableOperationsView);
        AssertPermission(
            nameof(TableOperationsController.GetWithPaginatedList),
            PermissionCodes.TableOperationsView);
        AssertPermission(
            nameof(TableOperationsController.TransferTable),
            PermissionCodes.TableOperationsTransfer);
        AssertPermission(
            nameof(TableOperationsController.MergeTables),
            PermissionCodes.TableOperationsMerge);
        AssertPermission(
            nameof(TableOperationsController.SplitTable),
            PermissionCodes.TableOperationsSplit);
        AssertPermission(
            nameof(TableOperationsController.Update),
            PermissionCodes.TableOperationsUpdate);
        AssertPermission(
            nameof(TableOperationsController.Delete),
            PermissionCodes.TableOperationsCancel);
    }

    private static void AssertPermission(
        string actionName,
        string permissionCode)
    {
        var method = typeof(TableOperationsController).GetMethod(
            actionName,
            BindingFlags.Instance |
            BindingFlags.Public |
            BindingFlags.DeclaredOnly);

        Assert.NotNull(method);

        var attribute = method!
            .GetCustomAttributes<HasPermissionAttribute>(inherit: true)
            .Single();

        Assert.Equal(
            $"{HasPermissionAttribute.PolicyPrefix}{permissionCode}",
            attribute.Policy);
    }

    private static async Task AuthenticateAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string role)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"table-operation-{role.ToLowerInvariant()}-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";

        await factory.SeedUserAsync(email, password, role: role);
        var token = await LoginAsync(client, email, password);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }

    private static async Task<Guid> SeedOperationAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        await context.Database.EnsureCreatedAsync();

        var operation = new TableOperation(
            "Transfer",
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Ghi chú ban đầu");

        context.TableOperations.Add(operation);
        await context.SaveChangesAsync();

        return operation.Id;
    }

    private static async Task<TableOperation> GetOperationAsync(
        ApiWebApplicationFactory factory,
        Guid operationId)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        return await context.TableOperations
            .AsNoTracking()
            .SingleAsync(x => x.Id == operationId);
    }

    private static async Task<string> LoginAsync(
        HttpClient client,
        string email,
        string password)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new
            {
                email,
                password
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var token = json.RootElement
            .GetProperty("data")
            .GetProperty("token")
            .GetString();

        Assert.False(string.IsNullOrWhiteSpace(token));
        return token!;
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}