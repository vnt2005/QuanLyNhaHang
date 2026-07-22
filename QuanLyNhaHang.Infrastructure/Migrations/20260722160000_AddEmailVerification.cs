using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260722160000_AddEmailVerification")]
public partial class AddEmailVerification : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "EmailVerificationCode",
            table: "Users",
            type: "nvarchar(500)",
            maxLength: 500,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "EmailVerificationCodeExpiresAt",
            table: "Users",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "EmailVerificationFailedAttempts",
            table: "Users",
            type: "int",
            nullable: false,
            defaultValue: 0);

        migrationBuilder.AddColumn<DateTime>(
            name: "EmailVerificationLockedUntil",
            table: "Users",
            type: "datetime2",
            nullable: true);

        migrationBuilder.AddColumn<bool>(
            name: "IsEmailVerified",
            table: "Users",
            type: "bit",
            nullable: false,
            defaultValue: false);

        // Existing accounts predate verification and must keep their current access.
        migrationBuilder.Sql(
            "UPDATE [Users] SET [IsEmailVerified] = CAST(1 AS bit);");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "EmailVerificationCode",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "EmailVerificationCodeExpiresAt",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "EmailVerificationFailedAttempts",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "EmailVerificationLockedUntil",
            table: "Users");

        migrationBuilder.DropColumn(
            name: "IsEmailVerified",
            table: "Users");
    }
}
