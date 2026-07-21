using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260721163000_AddAuthSessions")]
public partial class AddAuthSessions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "AuthSessions",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                TokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                RevocationReason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                ReplacedBySessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                IpAddress = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                UserAgent = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_AuthSessions", x => x.Id);
                table.ForeignKey(
                    name: "FK_AuthSessions_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_AuthSessions_TokenHash",
            table: "AuthSessions",
            column: "TokenHash",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_AuthSessions_UserId",
            table: "AuthSessions",
            column: "UserId");

        migrationBuilder.CreateIndex(
            name: "IX_AuthSessions_UserId_RevokedAt_ExpiresAt",
            table: "AuthSessions",
            columns: new[] { "UserId", "RevokedAt", "ExpiresAt" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "AuthSessions");
    }
}
