using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260822120000_AutomatePaidInvoicesAndAllowTakeaway")]
public partial class AutomatePaidInvoicesAndAllowTakeaway : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<Guid>(
            name: "RestaurantTableId",
            table: "Invoices",
            type: "uniqueidentifier",
            nullable: true,
            oldClrType: typeof(Guid),
            oldType: "uniqueidentifier");

        migrationBuilder.Sql(
            """
            DECLARE @IssuedInvoices TABLE
            (
                [InvoiceId] uniqueidentifier NOT NULL,
                [OrderId] uniqueidentifier NOT NULL,
                [PaymentId] uniqueidentifier NOT NULL
            );

            INSERT INTO [Invoices]
            (
                [Id],
                [OrderId],
                [PaymentId],
                [RestaurantTableId],
                [InvoiceCode],
                [OrderCode],
                [PaymentCode],
                [RestaurantTableName],
                [TotalAmount],
                [DiscountAmount],
                [VatAmount],
                [FinalAmount],
                [CustomerPaid],
                [ChangeAmount],
                [PaymentMethod],
                [Status],
                [Note],
                [IssuedAt],
                [CreatedAt],
                [UpdatedAt]
            )
            OUTPUT
                INSERTED.[Id],
                INSERTED.[OrderId],
                INSERTED.[PaymentId]
            INTO @IssuedInvoices
            SELECT
                NEWID(),
                payment.[OrderId],
                payment.[Id],
                [order].[RestaurantTableId],
                CONCAT(
                    'INV-MIG-',
                    REPLACE(CONVERT(varchar(36), NEWID()), '-', '')
                ),
                [order].[OrderCode],
                payment.[PaymentCode],
                CASE
                    WHEN [order].[RestaurantTableId] IS NULL
                        THEN N'Mang về'
                    ELSE COALESCE([table].[Name], N'Bàn không xác định')
                END,
                payment.[TotalAmount],
                payment.[DiscountAmount],
                payment.[VatAmount],
                payment.[FinalAmount],
                payment.[CustomerPaid],
                payment.[ChangeAmount],
                payment.[PaymentMethod],
                'Issued',
                N'Tự động bổ sung từ giao dịch đã thanh toán',
                payment.[PaidAt],
                payment.[CreatedAt],
                NULL
            FROM [Payments] AS payment
            INNER JOIN [Orders] AS [order]
                ON [order].[Id] = payment.[OrderId]
            LEFT JOIN [RestaurantTables] AS [table]
                ON [table].[Id] = [order].[RestaurantTableId]
            WHERE payment.[Status] = 'Paid'
              AND NOT EXISTS
              (
                  SELECT 1
                  FROM [Invoices] AS invoice
                  WHERE invoice.[Status] <> 'Cancelled'
                    AND
                    (
                        invoice.[PaymentId] = payment.[Id]
                        OR invoice.[OrderId] = payment.[OrderId]
                    )
              );

            INSERT INTO [InvoiceItems]
            (
                [Id],
                [InvoiceId],
                [OrderItemId],
                [MenuItemId],
                [MenuItemName],
                [Quantity],
                [UnitPrice],
                [TotalPrice],
                [Note],
                [CreatedAt]
            )
            SELECT
                NEWID(),
                issued.[InvoiceId],
                item.[Id],
                item.[MenuItemId],
                item.[MenuItemName],
                item.[Quantity],
                item.[UnitPrice],
                item.[TotalPrice],
                item.[Note],
                item.[CreatedAt]
            FROM @IssuedInvoices AS issued
            INNER JOIN [OrderItems] AS item
                ON item.[OrderId] = issued.[OrderId]
            WHERE item.[Status] <> 'Cancelled';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DELETE item
            FROM [InvoiceItems] AS item
            INNER JOIN [Invoices] AS invoice
                ON invoice.[Id] = item.[InvoiceId]
            WHERE invoice.[RestaurantTableId] IS NULL;

            DELETE FROM [Invoices]
            WHERE [RestaurantTableId] IS NULL;
            """);

        migrationBuilder.AlterColumn<Guid>(
            name: "RestaurantTableId",
            table: "Invoices",
            type: "uniqueidentifier",
            nullable: false,
            oldClrType: typeof(Guid),
            oldType: "uniqueidentifier",
            oldNullable: true);
    }
}
