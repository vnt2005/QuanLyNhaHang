using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public sealed class NotificationConfiguration
    : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId)
            .IsRequired();

        builder.Property(x => x.Type)
            .IsRequired()
            .HasMaxLength(80);

        builder.Property(x => x.Title)
            .IsRequired()
            .HasMaxLength(160);

        builder.Property(x => x.Message)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.Severity)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.Target)
            .HasMaxLength(80)
            .IsRequired(false);

        builder.Property(x => x.EntityId)
            .IsRequired(false);

        builder.Property(x => x.IsRead)
            .IsRequired();

        builder.Property(x => x.ReadAt)
            .IsRequired(false);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => x.EntityId);
        builder.HasIndex(x => new
        {
            x.UserId,
            x.IsRead,
            x.CreatedAt
        });
    }
}
