using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RestaurantSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RestaurantName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    TaxCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    LogoUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    DefaultVatPercent = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ServiceChargePercent = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    OpeningTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ClosingTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    InvoiceFooter = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    QrOrderWelcomeMessage = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RestaurantSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSettings_Email",
                table: "RestaurantSettings",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSettings_IsActive",
                table: "RestaurantSettings",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSettings_PhoneNumber",
                table: "RestaurantSettings",
                column: "PhoneNumber");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSettings_RestaurantName",
                table: "RestaurantSettings",
                column: "RestaurantName");

            migrationBuilder.CreateIndex(
                name: "IX_RestaurantSettings_TaxCode",
                table: "RestaurantSettings",
                column: "TaxCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RestaurantSettings");
        }
    }
}
