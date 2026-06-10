using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class ActivityLogConfiguration : IEntityTypeConfiguration<ActivityLog>
{
    public void Configure(EntityTypeBuilder<ActivityLog> builder)
    {
        builder.ToTable("ActivityLogs");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId)
            .IsRequired(false);

        builder.Property(x => x.UserName)
            .HasMaxLength(200);

        builder.Property(x => x.Action)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.ModuleName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.EntityName)
            .HasMaxLength(100);

        builder.Property(x => x.EntityId)
            .IsRequired(false);

        builder.Property(x => x.Description)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(x => x.OldValues)
            .HasColumnType("nvarchar(max)");

        builder.Property(x => x.NewValues)
            .HasColumnType("nvarchar(max)");

        builder.Property(x => x.IpAddress)
            .HasMaxLength(100);

        builder.Property(x => x.UserAgent)
            .HasMaxLength(500);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.HasIndex(x => x.UserId);

        builder.HasIndex(x => x.Action);

        builder.HasIndex(x => x.ModuleName);

        builder.HasIndex(x => x.EntityName);

        builder.HasIndex(x => x.EntityId);

        builder.HasIndex(x => x.Status);

        builder.HasIndex(x => x.CreatedAt);

        builder.HasIndex(x => new
        {
            x.ModuleName,
            x.Action,
            x.CreatedAt
        });

        builder.HasIndex(x => new
        {
            x.EntityName,
            x.EntityId
        });
    }
}