param(
    [switch]$Apply
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repositoryRoot

try {
    $databaseContainer = (& docker compose ps -q database).Trim()
    if (-not $databaseContainer) {
        throw 'Container database chưa chạy. Hãy chạy docker compose up -d trước.'
    }

    $databasePassword = (& docker compose exec -T database printenv MSSQL_SA_PASSWORD).Trim()
    if (-not $databasePassword) {
        throw 'Không đọc được MSSQL_SA_PASSWORD từ container database.'
    }

    $sqlcmdPath = (& docker compose exec -T database sh -lc `
        'if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then echo /opt/mssql-tools18/bin/sqlcmd; elif [ -x /opt/mssql-tools/bin/sqlcmd ]; then echo /opt/mssql-tools/bin/sqlcmd; else exit 1; fi').Trim()

    if (-not $sqlcmdPath) {
        throw 'Không tìm thấy sqlcmd trong container database.'
    }

    $whereClause = @"
[Role] = N'Customer'
AND [IsEmailVerified] = CAST(0 AS bit)
AND [Ho] = N'Playwright'
AND [Email] LIKE N'customer-%@example.com'
"@

    $previewQuery = @"
SET NOCOUNT ON;
SELECT
    [Id],
    [Ho],
    [Ten],
    [Email],
    [IsActive],
    [IsEmailVerified]
FROM [dbo].[Users]
WHERE $whereClause
ORDER BY [CreatedAt];

SELECT COUNT(*) AS [PendingPlaywrightCustomers]
FROM [dbo].[Users]
WHERE $whereClause;
"@

    Write-Host 'Các tài khoản Playwright cũ đang chờ xác minh:' -ForegroundColor Cyan
    & docker compose exec -T database $sqlcmdPath `
        -S localhost -U sa -P $databasePassword -C `
        -d QuanLyNhaHang -Q $previewQuery

    if (-not $Apply) {
        Write-Host ''
        Write-Host 'Đây là chế độ xem trước. Không có dữ liệu nào bị thay đổi.' -ForegroundColor Yellow
        Write-Host 'Chạy lại với -Apply để xác minh đúng các tài khoản ở trên:' -ForegroundColor Yellow
        Write-Host 'powershell -ExecutionPolicy Bypass -File .\scripts\verify-playwright-customers.ps1 -Apply'
        exit 0
    }

    $applyQuery = @"
SET NOCOUNT ON;

UPDATE [dbo].[Users]
SET
    [IsEmailVerified] = CAST(1 AS bit),
    [EmailVerificationCode] = NULL,
    [EmailVerificationCodeExpiresAt] = NULL,
    [EmailVerificationFailedAttempts] = 0,
    [EmailVerificationLockedUntil] = NULL,
    [UpdatedAt] = SYSUTCDATETIME()
WHERE $whereClause;

DECLARE @VerifiedCount int = @@ROWCOUNT;
SELECT @VerifiedCount AS [VerifiedCount];

SELECT COUNT(*) AS [RemainingPendingPlaywrightCustomers]
FROM [dbo].[Users]
WHERE $whereClause;
"@

    Write-Host ''
    Write-Host 'Đang xác minh các tài khoản Playwright cũ...' -ForegroundColor Cyan
    & docker compose exec -T database $sqlcmdPath `
        -S localhost -U sa -P $databasePassword -C `
        -d QuanLyNhaHang -Q $applyQuery

    Write-Host ''
    Write-Host 'Hoàn tất. Trạng thái khóa/hoạt động của từng tài khoản được giữ nguyên.' -ForegroundColor Green
}
finally {
    Pop-Location
}
