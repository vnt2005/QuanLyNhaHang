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

public sealed class OperationalTableSelectionTests
{
    [Fact]
    public async Task SelectionAndAreaDeletion_UseOneOperationalTablePolicy()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var areaName = $"Khu vực chọn bàn {suffix}";
        var tableName = $"Bàn chọn lọc {suffix}";

        using var createAreaResponse = await client.PostAsJsonAsync(
            "/api/Areas",
            new
            {
                name = areaName,
                description = "Kiểm tra policy bàn vận hành dùng chung."
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
                note = "Bàn dùng cho kiểm thử lựa chọn theo mục đích."
            });

        Assert.Equal(HttpStatusCode.Created, createTableResponse.StatusCode);
        using var tableJson = await ReadJsonAsync(createTableResponse);
        var tableId = tableJson.RootElement.GetProperty("id").GetGuid();

        await AssertSelectionContainsAsync(
            client,
            tableId,
            "Reservation",
            expected: true);
        await AssertSelectionContainsAsync(
            client,
            tableId,
            "Order",
            expected: true);
        await AssertSelectionContainsAsync(
            client,
            tableId,
            "QrCode",
            expected: true);

        using var createReservationResponse = await client.PostAsJsonAsync(
            "/api/reservations",
            new
            {
                restaurantTableId = tableId,
                customerName = "Khách chọn bàn",
                phoneNumber = "0900000012",
                email = "selectable-table@example.com",
                numberOfGuests = 2,
                reservationTime = DateTime.UtcNow.AddDays(2),
                depositAmount = 50_000m,
                note = "Tạo thật qua cùng policy với selector."
            });

        Assert.Equal(
            HttpStatusCode.OK,
            createReservationResponse.StatusCode);

        using var occupyResponse = await client.PatchAsJsonAsync(
            $"/api/RestaurantTables/{tableId}/status",
            new { id = tableId, status = "Occupied" });

        Assert.Equal(HttpStatusCode.OK, occupyResponse.StatusCode);

        // Occupied can mean guests are seated but no order exists yet.
        await AssertSelectionContainsAsync(
            client,
            tableId,
            "Order",
            expected: true);

        using var cleaningResponse = await client.PatchAsJsonAsync(
            $"/api/RestaurantTables/{tableId}/status",
            new { id = tableId, status = "Cleaning" });

        Assert.Equal(HttpStatusCode.OK, cleaningResponse.StatusCode);
        await AssertSelectionContainsAsync(
            client,
            tableId,
            "Order",
            expected: false);

        using var availableResponse = await client.PatchAsJsonAsync(
            $"/api/RestaurantTables/{tableId}/status",
            new { id = tableId, status = "Available" });

        Assert.Equal(HttpStatusCode.OK, availableResponse.StatusCode);

        using var createQrResponse = await client.PostAsJsonAsync(
            "/api/table-qr-codes",
            new
            {
                restaurantTableId = tableId,
                clientBaseUrl = "http://localhost:5173",
                note = "QR phải bị vô hiệu hóa khi xóa khu vực."
            });

        Assert.Equal(HttpStatusCode.OK, createQrResponse.StatusCode);
        using var qrJson = await ReadJsonAsync(createQrResponse);
        var qrData = qrJson.RootElement.GetProperty("data");
        var qrId = qrData.GetProperty("id").GetGuid();
        var originalQrToken = qrData.GetProperty("token").GetString();

        Assert.False(string.IsNullOrWhiteSpace(originalQrToken));
        await AssertSelectionContainsAsync(
            client,
            tableId,
            "QrCode",
            expected: false);

        using var deactivateQrResponse = await client.DeleteAsync(
            $"/api/table-qr-codes/{qrId}");

        Assert.Equal(
            HttpStatusCode.OK,
            deactivateQrResponse.StatusCode);
        await AssertSelectionContainsAsync(
            client,
            tableId,
            "QrCode",
            expected: true);

        using var recreateQrResponse = await client.PostAsJsonAsync(
            "/api/table-qr-codes",
            new
            {
                restaurantTableId = tableId,
                clientBaseUrl = "http://localhost:5173",
                note = "QR inactive phải được cấp token mới."
            });

        Assert.Equal(HttpStatusCode.OK, recreateQrResponse.StatusCode);
        using var recreatedQrJson = await ReadJsonAsync(recreateQrResponse);
        var recreatedQrData =
            recreatedQrJson.RootElement.GetProperty("data");
        var qrToken = recreatedQrData.GetProperty("token").GetString();

        Assert.Equal(
            qrId,
            recreatedQrData.GetProperty("id").GetGuid());
        Assert.False(string.IsNullOrWhiteSpace(qrToken));
        Assert.NotEqual(originalQrToken, qrToken);
        await AssertSelectionContainsAsync(
            client,
            tableId,
            "QrCode",
            expected: false);

        using var oldPublicQrResponse = await client.GetAsync(
            $"/api/qr-order/{Uri.EscapeDataString(originalQrToken!)}");

        Assert.Equal(
            HttpStatusCode.NotFound,
            oldPublicQrResponse.StatusCode);

        using var deleteAreaResponse = await client.DeleteAsync(
            $"/api/Areas/{areaId}");

        Assert.Equal(HttpStatusCode.OK, deleteAreaResponse.StatusCode);

        foreach (var purpose in new[] { "Reservation", "Order", "QrCode" })
        {
            await AssertSelectionContainsAsync(
                client,
                tableId,
                purpose,
                expected: false);
        }

        using var areaListResponse = await client.GetAsync(
            $"/api/Areas/paginated?keyword={Uri.EscapeDataString(areaName)}&pageNumber=1&pageSize=12");

        Assert.Equal(HttpStatusCode.OK, areaListResponse.StatusCode);
        using var areaListJson = await ReadJsonAsync(areaListResponse);
        Assert.Equal(
            0,
            areaListJson.RootElement.GetProperty("totalCount").GetInt32());

        using var publicQrResponse = await client.GetAsync(
            $"/api/qr-order/{Uri.EscapeDataString(qrToken!)}");

        Assert.Equal(HttpStatusCode.NotFound, publicQrResponse.StatusCode);

        using var verificationScope = factory.Services.CreateScope();
        var context = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var persistedArea = await context.Areas
            .AsNoTracking()
            .SingleAsync(x => x.Id == areaId);
        var persistedTable = await context.RestaurantTables
            .AsNoTracking()
            .SingleAsync(x => x.Id == tableId);
        var persistedQr = await context.TableQrCodes
            .AsNoTracking()
            .SingleAsync(x => x.Id == qrId);

        Assert.False(persistedArea.IsActive);
        Assert.False(persistedTable.IsActive);
        Assert.False(persistedQr.IsActive);
        Assert.Equal("Inactive", persistedQr.Status);
    }

    private static async Task AssertSelectionContainsAsync(
        HttpClient client,
        Guid tableId,
        string purpose,
        bool expected)
    {
        var endpoint = purpose switch
        {
            "Reservation" => "/api/reservations/selectable-tables",
            "Order" => "/api/Orders/selectable-tables",
            "QrCode" => "/api/table-qr-codes/selectable-tables",
            _ => throw new ArgumentOutOfRangeException(
                nameof(purpose),
                purpose,
                "Mục đích chọn bàn không hợp lệ.")
        };

        using var response = await client.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl?.NoStore ?? false);

        using var json = await ReadJsonAsync(response);
        var containsTable = json.RootElement
            .EnumerateArray()
            .Any(item => item.GetProperty("id").GetGuid() == tableId);

        Assert.Equal(expected, containsTable);
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"operational-table-{suffix}@example.com";
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
