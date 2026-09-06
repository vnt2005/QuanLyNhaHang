using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260906225500_CleanupLegacyAdminManualPayment")]
public partial class CleanupLegacyAdminManualPayment : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            DECLARE @legacyPaymentCode nvarchar(80) = N'PAY-20260828183131734-A4A2109B';
            DECLARE @legacyPaymentId uniqueidentifier = NULL;
            DECLARE @legacyOrderId uniqueidentifier = NULL;

            SELECT TOP (1)
                @legacyPaymentId = Id,
                @legacyOrderId = OrderId
            FROM dbo.Payments
            WHERE PaymentCode = @legacyPaymentCode;

            IF @legacyPaymentId IS NOT NULL
            BEGIN
                -- This record was created/marked Paid from the legacy Admin Web App,
                -- not from a customer SePay webhook. Preserve it for audit history,
                -- but revoke every state that can make it look like a real payment.
                UPDATE dbo.PaymentAttempts
                SET Status = N'Cancelled',
                    ProviderStatus = N'LEGACY_ADMIN_MANUAL',
                    ReviewReason = N'Legacy Admin Web App false-paid record; not verified by customer SePay webhook.',
                    UpdatedAt = SYSUTCDATETIME()
                WHERE PaymentId = @legacyPaymentId;

                UPDATE dbo.Payments
                SET Status = N'Cancelled',
                    Note = CASE
                        WHEN Note IS NULL OR LTRIM(RTRIM(Note)) = N''
                            THEN N'Legacy invalid manual payment: Admin Web App false-paid record.'
                        WHEN Note NOT LIKE N'Legacy invalid manual payment:%'
                            THEN N'Legacy invalid manual payment: Admin Web App false-paid record. Original: ' + Note
                        ELSE Note
                    END,
                    UpdatedAt = SYSUTCDATETIME()
                WHERE Id = @legacyPaymentId;

                -- The order was never actually paid. If it has no other valid paid
                -- payment and no active invoice, restore the same terminal state used
                -- by the unpaid-order cancellation flow.
                IF NOT EXISTS (
                        SELECT 1
                        FROM dbo.Payments
                        WHERE OrderId = @legacyOrderId
                          AND Id <> @legacyPaymentId
                          AND Status = N'Paid')
                   AND NOT EXISTS (
                        SELECT 1
                        FROM dbo.Invoices
                        WHERE OrderId = @legacyOrderId
                          AND Status <> N'Cancelled')
                BEGIN
                    UPDATE dbo.Orders
                    SET Status = N'Cancelled',
                        IsActive = 0,
                        UpdatedAt = SYSUTCDATETIME()
                    WHERE Id = @legacyOrderId;

                    UPDATE dbo.OrderItems
                    SET Status = N'Cancelled',
                        UpdatedAt = SYSUTCDATETIME()
                    WHERE OrderId = @legacyOrderId
                      AND Status <> N'Cancelled';
                END;
            END;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Intentionally irreversible: this migration corrects a confirmed invalid
        // legacy payment. Reverting it would re-introduce a false Paid transaction.
    }
}
