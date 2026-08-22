using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.ToTable("Reservations", table =>
        {
            table.HasCheckConstraint(
                "CK_Reservations_NumberOfGuests_Positive",
                "[NumberOfGuests] > 0");
            table.HasCheckConstraint(
                "CK_Reservations_DepositAmount_NonNegative",
                "[DepositAmount] >= 0");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReservationCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.RestaurantTableId)
            .IsRequired();

        builder.Property(x => x.CustomerName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.PhoneNumber)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.Email)
            .HasMaxLength(150);

        builder.Property(x => x.NumberOfGuests)
            .IsRequired();

        builder.Property(x => x.ReservationTime)
            .IsRequired();

        builder.Property(x => x.DepositAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.ConfirmedAt)
            .IsRequired(false);

        builder.Property(x => x.CheckedInAt)
            .IsRequired(false);

        builder.Property(x => x.CompletedAt)
            .IsRequired(false);

        builder.Property(x => x.CancelledAt)
            .IsRequired(false);

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.Property(x => x.RowVersion)
            .IsRowVersion();

        builder.HasIndex(x => x.ReservationCode)
            .IsUnique();

        builder.HasIndex(x => x.RestaurantTableId);

        builder.HasIndex(x => x.CustomerName);

        builder.HasIndex(x => x.PhoneNumber);

        builder.HasIndex(x => x.ReservationTime);

        builder.HasIndex(x => x.Status);

        builder.HasIndex(x => new
        {
            x.RestaurantTableId,
            x.ReservationTime,
            x.Status
        });

        builder.HasOne<RestaurantTable>()
            .WithMany()
            .HasForeignKey(x => x.RestaurantTableId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
