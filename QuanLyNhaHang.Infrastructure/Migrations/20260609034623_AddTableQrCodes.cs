using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTableQrCodes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TableQrCodes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RestaurantTableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Token = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    QrCodeUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TableQrCodes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TableQrCodes_IsActive",
                table: "TableQrCodes",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_TableQrCodes_RestaurantTableId",
                table: "TableQrCodes",
                column: "RestaurantTableId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TableQrCodes_Status",
                table: "TableQrCodes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_TableQrCodes_Token",
                table: "TableQrCodes",
                column: "Token",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TableQrCodes");
        }
    }
}
