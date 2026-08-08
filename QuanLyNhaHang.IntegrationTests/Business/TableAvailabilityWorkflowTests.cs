using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class TableAvailabilityWorkflowTests
{
    [Fact]
    public async Task DeleteTable_HidesItAndDisablesReservationAndQrAccess()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var areaName = $"Khu bàn ngừng hoạt động {suffix}";
        var tableName = $"Bàn ngừng hoạt động {suffix}";

        using var createAreaResponse = await client.PostAsJsonAsync(
            "/api/Areas",
            new
            {
                name = areaName,
                description = "Kiểm tra vòng đời bàn và QR."
            });

        Assert.Equal(HttpStatusCode.Created, createAreaResponse.StatusCode);
        using var areaJson = await ReadJsonAsync(createAreaResponse);
        var areaId = areaJson.RootElement.GetProperty("id").GetGuid();

        using var createTableResponse = await client.PostAsJsonAsync(
            "/api/RestaurantTables",
            new
            {
                areaId,
                name = tableName,
                capacity = 4,
                note = "Bàn sẽ được vô hiệu hóa trong integration test."
            });

        Assert.Equal(HttpStatusCode.Created, createTableResponse.StatusCode);
        using var tableJson = await ReadJsonAsync(createTableResponse);
        var tableId = tableJson.RootElement.GetProperty("id").GetGuid();

        using var createQrResponse = await client.PostAsJsonAsync(
            "/api/table-qr-codes",
            new
            {
                restaurantTableId = tableId,
                clientBaseUrl = "http://localhost:5173",
                note = "QR phải ngừng hoạt động cùng bàn."
            });

        Assert.Equal(HttpStatusCode.OK, createQrResponse.StatusCode);
        using var qrJson = await ReadJsonAsync(createQrResponse);
        var qrData = qrJson.RootElement.GetProperty("data");
        var qrId = qrData.GetProperty("id").GetGuid();
        var qrToken = qrData.GetProperty("token").GetString();

        Assert.False(string.IsNullOrWhiteSpace(qrToken));

        using var deleteResponse = await client.DeleteAsync(
            $"/api/RestaurantTables/{tableId}");

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        using var listResponse = await client.GetAsync("/api/RestaurantTables");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        using var listJson = await ReadJsonAsync(listResponse);
        Assert.DoesNotContain(
            listJson.RootElement.EnumerateArray(),
            item => item.GetProperty("id").GetGuid() == tableId);

        using var paginatedResponse = await client.GetAsync(
            $"/api/RestaurantTables/paginated?keyword={Uri.EscapeDataString(tableName)}&pageNumber=1&pageSize=12");

        Assert.Equal(HttpStatusCode.OK, paginatedResponse.StatusCode);
        using var paginatedJson = await ReadJsonAsync(paginatedResponse);
        Assert.Equal(
            0,
            paginatedJson.RootElement.GetProperty("items").GetArrayLength());
        Assert.Equal(
            0,
            paginatedJson.RootElement.GetProperty("totalCount").GetInt32());

        using var getByIdResponse = await client.GetAsync(
            $"/api/RestaurantTables/{tableId}");

        Assert.Equal(HttpStatusCode.NotFound, getByIdResponse.StatusCode);

        using var reservationResponse = await client.PostAsJsonAsync(
            "/api/reservations",
            new
            {
                restaurantTableId = tableId,
                customerName = "Khách bàn đã xóa",
                phoneNumber = "0900000001",
                email = "inactive-table@example.com",
                numberOfGuests = 2,
                reservationTime = DateTime.UtcNow.AddDays(1),
                depositAmount = 0,
                note = "Yêu cầu này phải bị từ chối."
            });

        Assert.Equal(HttpStatusCode.BadRequest, reservationResponse.StatusCode);

        using var publicQrResponse = await client.GetAsync(
            $"/api/qr-order/{Uri.EscapeDataString(qrToken!)}");

        Assert.Equal(HttpStatusCode.NotFound, publicQrResponse.StatusCode);

        using var publicMenuResponse = await client.GetAsync(
            $"/api/qr-order/{Uri.EscapeDataString(qrToken!)}/menu-items");

        Assert.Equal(HttpStatusCode.BadRequest, publicMenuResponse.StatusCode);

        using var reactivateQrResponse = await client.PutAsJsonAsync(
            $"/api/table-qr-codes/{qrId}",
            new
            {
                id = qrId,
                status = "Active",
                note = "Không được kích hoạt lại QR của bàn đã xóa.",
                regenerate = false,
                clientBaseUrl = (string?)null
            });

        Assert.Equal(HttpStatusCode.BadRequest, reactivateQrResponse.StatusCode);

        using var verificationScope = factory.Services.CreateScope();
        var context = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var persistedTable = await context.RestaurantTables
            .AsNoTracking()
            .SingleAsync(x => x.Id == tableId);
        var persistedQr = await context.TableQrCodes
            .AsNoTracking()
            .SingleAsync(x => x.Id == qrId);

        Assert.False(persistedTable.IsActive);
        Assert.False(persistedQr.IsActive);
        Assert.Equal("Inactive", persistedQr.Status);
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"table-availability-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";

        await factory.SeedUserAsync(email, password);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var token = json.RootElement
            .GetProperty("data")
            .GetProperty("token")
            .GetString();

        Assert.False(string.IsNullOrWhiteSpace(token));
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
