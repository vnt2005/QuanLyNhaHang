using QuanLyNhaHang.Domain.Entities;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Domain;

public sealed class ReservationTests
{
    [Fact]
    public void Constructor_NormalizesInputAndCreatesPendingReservation()
    {
        var tableId = Guid.NewGuid();
        var reservationTime = DateTime.UtcNow.AddHours(2);

        var reservation = new Reservation(
            tableId,
            "  Nguyễn An  ",
            "  0900000001  ",
            "  AN@EXAMPLE.COM  ",
            4,
            reservationTime,
            200_000m,
            "  Bàn gần cửa sổ  ");

        Assert.NotEqual(Guid.Empty, reservation.Id);
        Assert.StartsWith("RSV-", reservation.ReservationCode);
        Assert.Equal(tableId, reservation.RestaurantTableId);
        Assert.Equal("Nguyễn An", reservation.CustomerName);
        Assert.Equal("0900000001", reservation.PhoneNumber);
        Assert.Equal("an@example.com", reservation.Email);
        Assert.Equal(4, reservation.NumberOfGuests);
        Assert.Equal(reservationTime, reservation.ReservationTime);
        Assert.Equal(200_000m, reservation.DepositAmount);
        Assert.Equal("Bàn gần cửa sổ", reservation.Note);
        Assert.Equal("Pending", reservation.Status);
    }

    [Fact]
    public void Lifecycle_RequiresConfirmThenCheckInThenComplete()
    {
        var reservation = CreateReservation();

        reservation.Confirm();

        Assert.Equal("Confirmed", reservation.Status);
        Assert.NotNull(reservation.ConfirmedAt);

        reservation.CheckIn();

        Assert.Equal("CheckedIn", reservation.Status);
        Assert.NotNull(reservation.CheckedInAt);

        reservation.Complete();

        Assert.Equal("Completed", reservation.Status);
        Assert.NotNull(reservation.CompletedAt);
    }

    [Fact]
    public void CheckIn_RejectsReservationThatIsNotConfirmed()
    {
        var reservation = CreateReservation();

        Assert.Throws<InvalidOperationException>(() =>
            reservation.CheckIn());
    }

    [Fact]
    public void Complete_RejectsReservationThatHasNotCheckedIn()
    {
        var reservation = CreateReservation();
        reservation.Confirm();

        Assert.Throws<InvalidOperationException>(() =>
            reservation.Complete());
    }

    [Fact]
    public void CancelledReservation_IsTerminal()
    {
        var reservation = CreateReservation();

        reservation.Cancel();

        Assert.Equal("Cancelled", reservation.Status);
        Assert.NotNull(reservation.CancelledAt);
        Assert.Throws<InvalidOperationException>(() =>
            reservation.Cancel());
        Assert.Throws<InvalidOperationException>(() =>
            reservation.Confirm());
        Assert.Throws<InvalidOperationException>(() =>
            reservation.UpdateInfo(
                Guid.NewGuid(),
                "Khách mới",
                "0911111111",
                null,
                2,
                DateTime.UtcNow.AddHours(3),
                0,
                null));
        Assert.Throws<InvalidOperationException>(() =>
            reservation.MarkNoShow());
    }

    [Fact]
    public void CompletedReservation_CannotBeChangedOrCancelled()
    {
        var reservation = CreateReservation();
        reservation.Confirm();
        reservation.CheckIn();
        reservation.Complete();

        Assert.Throws<InvalidOperationException>(() =>
            reservation.Cancel());
        Assert.Throws<InvalidOperationException>(() =>
            reservation.Confirm());
        Assert.Throws<InvalidOperationException>(() =>
            reservation.UpdateInfo(
                Guid.NewGuid(),
                "Khách mới",
                "0911111111",
                null,
                2,
                DateTime.UtcNow.AddHours(3),
                0,
                null));
        Assert.Throws<InvalidOperationException>(() =>
            reservation.MarkNoShow());
    }

    [Fact]
    public void MarkNoShow_ChangesNonTerminalReservation()
    {
        var reservation = CreateReservation();

        reservation.MarkNoShow();

        Assert.Equal("NoShow", reservation.Status);
        Assert.NotNull(reservation.UpdatedAt);
    }

    [Fact]
    public void Constructor_RejectsInvalidRequiredValues()
    {
        Assert.Throws<ArgumentException>(() => new Reservation(
            Guid.Empty,
            "Nguyễn An",
            "0900000001",
            null,
            2,
            DateTime.UtcNow.AddHours(2),
            0,
            null));

        Assert.Throws<ArgumentException>(() => new Reservation(
            Guid.NewGuid(),
            " ",
            "0900000001",
            null,
            2,
            DateTime.UtcNow.AddHours(2),
            0,
            null));

        Assert.Throws<ArgumentException>(() => new Reservation(
            Guid.NewGuid(),
            "Nguyễn An",
            " ",
            null,
            2,
            DateTime.UtcNow.AddHours(2),
            0,
            null));

        Assert.Throws<ArgumentException>(() => new Reservation(
            Guid.NewGuid(),
            "Nguyễn An",
            "0900000001",
            null,
            0,
            DateTime.UtcNow.AddHours(2),
            0,
            null));

        Assert.Throws<ArgumentException>(() => new Reservation(
            Guid.NewGuid(),
            "Nguyễn An",
            "0900000001",
            null,
            2,
            DateTime.UtcNow.AddHours(2),
            -1,
            null));
    }

    private static Reservation CreateReservation()
    {
        return new Reservation(
            Guid.NewGuid(),
            "Nguyễn An",
            "0900000001",
            "an@example.com",
            2,
            DateTime.UtcNow.AddHours(2),
            100_000m,
            null);
    }
}
