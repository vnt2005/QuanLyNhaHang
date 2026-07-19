using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HardenAuthCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "TwoFactorCode",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PasswordResetCode",
                table: "Users",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PasswordResetFailedAttempts",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "PasswordResetLockedUntil",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TwoFactorFailedAttempts",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "TwoFactorLockedUntil",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE [Users]
                SET
                    [TwoFactorCode] = NULL,
                    [TwoFactorCodeExpiresAt] = NULL,
                    [TwoFactorFailedAttempts] = 0,
                    [TwoFactorLockedUntil] = NULL,
                    [PasswordResetCode] = NULL,
                    [PasswordResetCodeExpiresAt] = NULL,
                    [PasswordResetFailedAttempts] = 0,
                    [PasswordResetLockedUntil] = NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PasswordResetFailedAttempts",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PasswordResetLockedUntil",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TwoFactorFailedAttempts",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "TwoFactorLockedUntil",
                table: "Users");

            migrationBuilder.AlterColumn<string>(
                name: "TwoFactorCode",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PasswordResetCode",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);
        }
    }
}
