using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Id)
            .IsRequired();

        builder.Property(x => x.Ho)
            .HasMaxLength(50)
            .IsRequired(false);

        builder.Property(x => x.Ten)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Email)
            .IsRequired()
            .HasMaxLength(150);

        builder.HasIndex(x => x.Email)
            .IsUnique();

        builder.Property(x => x.PhoneNumber)
            .IsRequired()
            .HasMaxLength(20);

        builder.HasIndex(x => x.PhoneNumber)
            .IsUnique();

        builder.Property(x => x.PasswordHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.Role)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.Property(x => x.IsEmailVerified)
            .IsRequired();

        builder.Property(x => x.EmailVerificationCode)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.Property(x => x.EmailVerificationCodeExpiresAt)
            .IsRequired(false);

        builder.Property(x => x.EmailVerificationFailedAttempts)
            .IsRequired();

        builder.Property(x => x.EmailVerificationLockedUntil)
            .IsRequired(false);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.Property(x => x.LoginFailedAttempts)
            .IsRequired();

        builder.Property(x => x.LoginLockedUntil)
            .IsRequired(false);

        builder.Property(x => x.TwoFactorCode)
    .HasMaxLength(500)
    .IsRequired(false);

        builder.Property(x => x.TwoFactorCodeExpiresAt)
            .IsRequired(false);

        builder.Property(x => x.TwoFactorFailedAttempts)
            .IsRequired();

        builder.Property(x => x.TwoFactorLockedUntil)
            .IsRequired(false);

        builder.Property(x => x.PasswordResetCode)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.Property(x => x.PasswordResetCodeExpiresAt)
            .IsRequired(false);

        builder.Property(x => x.PasswordResetFailedAttempts)
            .IsRequired();

        builder.Property(x => x.PasswordResetLockedUntil)
            .IsRequired(false);
    }
}