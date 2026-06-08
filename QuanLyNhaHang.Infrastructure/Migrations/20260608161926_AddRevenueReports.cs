using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRevenueReports : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RevenueReportItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RevenueReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MenuItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MenuItemName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    QuantitySold = table.Column<int>(type: "int", nullable: false),
                    TotalRevenue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RevenueReportItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RevenueReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FromDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ToDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalInvoices = table.Column<int>(type: "int", nullable: false),
                    TotalOrders = table.Column<int>(type: "int", nullable: false),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalDiscountAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalVatAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalRevenue = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalCustomerPaid = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalChangeAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AverageRevenuePerInvoice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RevenueReports", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReportItems_MenuItemId",
                table: "RevenueReportItems",
                column: "MenuItemId");

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReportItems_MenuItemName",
                table: "RevenueReportItems",
                column: "MenuItemName");

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReportItems_RevenueReportId",
                table: "RevenueReportItems",
                column: "RevenueReportId");

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReports_FromDate",
                table: "RevenueReports",
                column: "FromDate");

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReports_FromDate_ToDate",
                table: "RevenueReports",
                columns: new[] { "FromDate", "ToDate" });

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReports_FromDate_ToDate_Status",
                table: "RevenueReports",
                columns: new[] { "FromDate", "ToDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReports_ReportCode",
                table: "RevenueReports",
                column: "ReportCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReports_Status",
                table: "RevenueReports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_RevenueReports_ToDate",
                table: "RevenueReports",
                column: "ToDate");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RevenueReportItems");

            migrationBuilder.DropTable(
                name: "RevenueReports");
        }
    }
}
