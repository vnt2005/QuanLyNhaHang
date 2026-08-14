using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class ReservationWorkflowTests
{
    [Fact]
    public async Task CreateReservation_EnforcesCapacityAndTimeConflict()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var scenario = await SeedTableAsync(factory, capacity: 4);
        var reservationTime = DateTime.UtcNow.AddDays(1);

        using var firstResponse = await CreateReservationAsync(
            client,
            scenario.TableId,
            reservationTime,
            numberOfGuests: 4,
            customerName: "Khách thứ nhất");

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        using var firstJson = await ReadJsonAsync(firstResponse);
        Assert.Equal(
            "Pending",
            firstJson.RootElement
                .GetProperty("data")
                .GetProperty("status")
                .GetString());

        using var conflictResponse = await CreateReservationAsync(
            client,
            scenario.TableId,
            reservationTime.AddHours(1),
            numberOfGuests: 2,
            customerName: "Khách bị trùng lịch");

        Assert.Equal(
            HttpStatusCode.BadRequest,
            conflictResponse.StatusCode);

        using var conflictJson = await ReadJsonAsync(conflictResponse);
        Assert.Contains(
            "đã có lịch đặt",
            conflictJson.RootElement
                .GetProperty("message")
                .GetString() ?? string.Empty);

        using var capacityResponse = await CreateReservationAsync(
            client,
            scenario.TableId,
            reservationTime.AddHours(5),
            numberOfGuests: 5,
            customerName: "Khách vượt sức chứa");

        Assert.Equal(
            HttpStatusCode.BadRequest,
            capacityResponse.StatusCode);

        using var capacityJson = await ReadJsonAsync(capacityResponse);
        Assert.Contains(
            "vượt quá sức chứa",
            capacityJson.RootElement
                .GetProperty("message")
                .GetString() ?? string.Empty);

        using var separateResponse = await CreateReservationAsync(
            client,
            scenario.TableId,
            reservationTime.AddHours(2).AddMinutes(1),
            numberOfGuests: 2,
            customerName: "Khách khác khung giờ");

        Assert.Equal(HttpStatusCode.OK, separateResponse.StatusCode);
    }

    [Fact]
    public async Task ConfirmedFutureReservation_DoesNotOverrideOccupiedTable()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var scenario = await SeedTableAsync(factory, capacity: 4);
        await SeedActiveOrderAsync(factory, scenario.TableId);

        using var createResponse = await CreateReservationAsync(
            client,
            scenario.TableId,
            DateTime.UtcNow.AddDays(1),
            numberOfGuests: 2,
            customerName: "Khách đặt trước");

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        using var createJson = await ReadJsonAsync(createResponse);
        var reservationId = createJson.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();

        using var confirmResponse = await ChangeReservationStatusAsync(
            client,
            reservationId,
            "Confirmed");

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        using (var confirmedScope = factory.Services.CreateScope())
        {
            var context = confirmedScope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            var table = await context.RestaurantTables
                .AsNoTracking()
                .SingleAsync(x => x.Id == scenario.TableId);
            var reservation = await context.Reservations
                .AsNoTracking()
                .SingleAsync(x => x.Id == reservationId);

            Assert.Equal("Occupied", table.Status);
            Assert.Equal("Confirmed", reservation.Status);
        }

        using var checkInResponse = await ChangeReservationStatusAsync(
            client,
            reservationId,
            "CheckedIn");

        Assert.Equal(
            HttpStatusCode.BadRequest,
            checkInResponse.StatusCode);

        using var checkInJson = await ReadJsonAsync(checkInResponse);
        Assert.Contains(
            "đang có order hoạt động",
            checkInJson.RootElement
                .GetProperty("message")
                .GetString() ?? string.Empty);

        using var finalScope = factory.Services.CreateScope();
        var finalContext = finalScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var finalTable = await finalContext.RestaurantTables
            .AsNoTracking()
            .SingleAsync(x => x.Id == scenario.TableId);
        var finalReservation = await finalContext.Reservations
            .AsNoTracking()
            .SingleAsync(x => x.Id == reservationId);

        Assert.Equal("Occupied", finalTable.Status);
        Assert.Equal("Confirmed", finalReservation.Status);
    }

    [Fact]
    public async Task CustomerReservation_WhenConfirmed_CreatesNotificationForCustomer()
    {
        using var factory = new ApiWebApplicationFactory();
        using var customerClient = factory.CreateHttpsClient();
        using var adminClient = factory.CreateHttpsClient();

        var customerEmail = $"reservation-customer-{Guid.NewGuid():N}@example.com";
        var customerId = await AuthenticateAsync(
            factory,
            customerClient,
            customerEmail,
            SystemRoles.Customer);
        await AuthenticateAdminAsync(factory, adminClient);

        var scenario = await SeedTableAsync(factory, capacity: 4);
        using var createResponse = await customerClient.PostAsJsonAsync(
            "/api/customer-site/reservations",
            new
            {
                restaurantTableId = scenario.TableId,
                customerName = "Khách CustomerWeb",
                phoneNumber = "0900000099",
                email = "email-thay-doi@example.com",
                numberOfGuests = 2,
                reservationTime = DateTime.UtcNow.AddDays(2),
                note = "Kiểm tra notification xác nhận"
            });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        using var createJson = await ReadJsonAsync(createResponse);
        var reservationId = createJson.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();

        using var confirmResponse = await ChangeReservationStatusAsync(
            adminClient,
            reservationId,
            "Confirmed");

        Assert.Equal(HttpStatusCode.OK, confirmResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var reservation = await context.Reservations
            .AsNoTracking()
            .SingleAsync(x => x.Id == reservationId);
        var notification = await context.Notifications
            .AsNoTracking()
            .SingleAsync(x =>
                x.UserId == customerId &&
                x.EntityId == reservationId &&
                x.Type == "Reservation.Confirmed");

        Assert.Equal(customerEmail, reservation.Email);
        Assert.Equal("Đặt bàn đã được xác nhận", notification.Title);
        Assert.Equal("/reservation", notification.Target);
        Assert.False(notification.IsRead);
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"reservation-{Guid.NewGuid():N}@example.com";
        await AuthenticateAsync(factory, client, email, SystemRoles.Admin);
    }

    private static async Task<Guid> AuthenticateAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string email,
        string role)
    {
        const string password = "Password123!";

        var userId = await factory.SeedUserAsync(
            email,
            password,
            role: role);

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
        return userId;
    }

    private static async Task<TableScenario> SeedTableAsync(
        ApiWebApplicationFactory factory,
        int capacity)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        await context.Database.EnsureCreatedAsync();

        var area = new Area(
            $"Khu đặt bàn {Guid.NewGuid():N}",
            "Dữ liệu integration test");
        var table = new RestaurantTable(
            area.Id,
            $"Bàn đặt trước {Guid.NewGuid():N}",
            capacity,
            null);

        context.Areas.Add(area);
        context.RestaurantTables.Add(table);
        await context.SaveChangesAsync();

        return new TableScenario(table.Id);
    }

    private static async Task SeedActiveOrderAsync(
        ApiWebApplicationFactory factory,
        Guid tableId)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var table = await context.RestaurantTables
            .SingleAsync(x => x.Id == tableId);
        var order = new Order(
            tableId,
            $"ORD-TEST-{Guid.NewGuid():N}",
            "Order đang phục vụ");

        table.MarkOccupied();
        context.Orders.Add(order);

        await context.SaveChangesAsync();
    }

    private static Task<HttpResponseMessage> CreateReservationAsync(
        HttpClient client,
        Guid tableId,
        DateTime reservationTime,
        int numberOfGuests,
        string customerName)
    {
        return client.PostAsJsonAsync(
            "/api/reservations",
            new
            {
                restaurantTableId = tableId,
                customerName,
                phoneNumber = "0900000001",
                email = "reservation@example.com",
                numberOfGuests,
                reservationTime,
                depositAmount = 100_000m,
                note = "Integration test"
            });
    }

    private static Task<HttpResponseMessage> ChangeReservationStatusAsync(
        HttpClient client,
        Guid reservationId,
        string status)
    {
        return client.PatchAsJsonAsync(
            $"/api/reservations/{reservationId}/status",
            new
            {
                id = reservationId,
                status
            });
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record TableScenario(Guid TableId);
}
