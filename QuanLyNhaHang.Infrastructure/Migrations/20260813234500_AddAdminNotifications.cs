using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260813234500_AddAdminNotifications")]
public partial class AddAdminNotifications : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Notifications",
            columns: table => new
            {
                Id = table.Column<Guid>(
                    type: "uniqueidentifier",
                    nullable: false),
                UserId = table.Column<Guid>(
                    type: "uniqueidentifier",
                    nullable: false),
                Type = table.Column<string>(
                    type: "nvarchar(80)",
                    maxLength: 80,
                    nullable: false),
                Title = table.Column<string>(
                    type: "nvarchar(160)",
                    maxLength: 160,
                    nullable: false),
                Message = table.Column<string>(
                    type: "nvarchar(500)",
                    maxLength: 500,
                    nullable: false),
                Severity = table.Column<string>(
                    type: "nvarchar(20)",
                    maxLength: 20,
                    nullable: false),
                Target = table.Column<string>(
                    type: "nvarchar(80)",
                    maxLength: 80,
                    nullable: true),
                EntityId = table.Column<Guid>(
                    type: "uniqueidentifier",
                    nullable: true),
                IsRead = table.Column<bool>(
                    type: "bit",
                    nullable: false),
                ReadAt = table.Column<DateTime>(
                    type: "datetime2",
                    nullable: true),
                CreatedAt = table.Column<DateTime>(
                    type: "datetime2",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Notifications", x => x.Id);
                table.ForeignKey(
                    name: "FK_Notifications_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Notifications_CreatedAt",
            table: "Notifications",
            column: "CreatedAt");

        migrationBuilder.CreateIndex(
            name: "IX_Notifications_EntityId",
            table: "Notifications",
            column: "EntityId");

        migrationBuilder.CreateIndex(
            name: "IX_Notifications_UserId_IsRead_CreatedAt",
            table: "Notifications",
            columns: new[] { "UserId", "IsRead", "CreatedAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Notifications");
    }
}
