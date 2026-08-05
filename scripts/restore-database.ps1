[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$BackupFile,

    [ValidatePattern('^[A-Za-z0-9_]+$')]
    [string]$DatabaseName = 'QuanLyNhaHang',

    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-DockerCommand {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments
    )

    & docker @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Lệnh docker thất bại: docker $($Arguments -join ' ')"
    }
}

function Assert-DatabaseContainerRunning {
    $runningServices = @(
        & docker compose ps --status running --services
    )

    if ($LASTEXITCODE -ne 0 -or
        $runningServices -notcontains 'database') {
        throw (
            'Container database chưa chạy. Hãy chạy ' +
            '`docker compose up -d database` trước.'
        )
    }
}

function Invoke-SqlFileInContainer {
    param(
        [Parameter(Mandatory)]
        [string]$LocalSqlFile,

        [Parameter(Mandatory)]
        [string]$ContainerSqlFile
    )

    Invoke-DockerCommand -Arguments @(
        'compose', 'cp',
        $LocalSqlFile,
        "database:$ContainerSqlFile"
    )

    $command = @'
set -e
if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then
    SQLCMD=/opt/mssql-tools18/bin/sqlcmd
    TRUST_SERVER_CERTIFICATE=-C
else
    SQLCMD=/opt/mssql-tools/bin/sqlcmd
    TRUST_SERVER_CERTIFICATE=
fi
"$SQLCMD" -S localhost -U sa -P "$MSSQL_SA_PASSWORD" $TRUST_SERVER_CERTIFICATE -b -i "$SQL_FILE"
'@

    $arguments = @(
        'compose', 'exec', '-T',
        '--env', "SQL_FILE=$ContainerSqlFile",
        'database', '/bin/bash', '-lc', $command
    )

    try {
        Invoke-DockerCommand -Arguments $arguments
    }
    finally {
        & docker compose exec -T database rm -f $ContainerSqlFile
    }
}

Assert-DatabaseContainerRunning

$resolvedBackupFile = (Resolve-Path $BackupFile).Path

if ([System.IO.Path]::GetExtension($resolvedBackupFile) -ne '.bak') {
    throw 'File khôi phục phải có phần mở rộng .bak.'
}

if (-not $Force) {
    Write-Warning (
        "Thao tác này sẽ thay thế toàn bộ database $DatabaseName " +
        'bằng dữ liệu trong file backup.'
    )
    $confirmation = Read-Host (
        "Nhập chính xác tên database '$DatabaseName' để tiếp tục"
    )

    if ($confirmation -cne $DatabaseName) {
        throw 'Đã hủy khôi phục vì chuỗi xác nhận không khớp.'
    }
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$containerDirectory = '/var/opt/mssql/backup'
$containerBackupPath = "$containerDirectory/restore-$timestamp.bak"
$containerVerifySql = "/tmp/verify-restore-$timestamp.sql"
$containerRestoreSql = "/tmp/restore-$timestamp.sql"
$containerRecoverySql = "/tmp/recovery-$timestamp.sql"
$tempDirectory = [System.IO.Path]::GetTempPath()
$localVerifySql = Join-Path $tempDirectory "verify-restore-$timestamp.sql"
$localRestoreSql = Join-Path $tempDirectory "restore-$timestamp.sql"
$localRecoverySql = Join-Path $tempDirectory "recovery-$timestamp.sql"
$restoreAttempted = $false

Invoke-DockerCommand -Arguments @(
    'compose', 'exec', '-T', 'database',
    'mkdir', '-p', $containerDirectory
)

Invoke-DockerCommand -Arguments @(
    'compose', 'cp',
    $resolvedBackupFile,
    "database:$containerBackupPath"
)

$verifyQuery = @"
RESTORE VERIFYONLY
FROM DISK = N'$containerBackupPath'
WITH CHECKSUM;
"@

$restoreQuery = @"
USE [master];
ALTER DATABASE [$DatabaseName]
SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE [$DatabaseName]
FROM DISK = N'$containerBackupPath'
WITH REPLACE, RECOVERY, CHECKSUM, STATS = 10;
ALTER DATABASE [$DatabaseName] SET MULTI_USER;
"@

$recoveryQuery = @"
USE [master];
IF DB_ID(N'$DatabaseName') IS NOT NULL
    ALTER DATABASE [$DatabaseName] SET MULTI_USER WITH ROLLBACK IMMEDIATE;
"@

try {
    Set-Content -Path $localVerifySql -Value $verifyQuery -Encoding utf8
    Set-Content -Path $localRestoreSql -Value $restoreQuery -Encoding utf8
    Set-Content -Path $localRecoverySql -Value $recoveryQuery -Encoding utf8

    Write-Host 'Đang kiểm tra tính toàn vẹn của file backup...'
    Invoke-SqlFileInContainer -LocalSqlFile $localVerifySql -ContainerSqlFile $containerVerifySql

    Write-Host "Đang khôi phục database $DatabaseName..."
    $restoreAttempted = $true
    Invoke-SqlFileInContainer -LocalSqlFile $localRestoreSql -ContainerSqlFile $containerRestoreSql

    Write-Host 'Khôi phục database thành công.'
}
finally {
    if ($restoreAttempted) {
        try {
            Invoke-SqlFileInContainer -LocalSqlFile $localRecoverySql -ContainerSqlFile $containerRecoverySql
        }
        catch {
            Write-Warning (
                'Không thể tự chuyển database về MULTI_USER. ' +
                'Hãy kiểm tra trạng thái database thủ công.'
            )
        }
    }

    Remove-Item -Force -ErrorAction SilentlyContinue $localVerifySql
    Remove-Item -Force -ErrorAction SilentlyContinue $localRestoreSql
    Remove-Item -Force -ErrorAction SilentlyContinue $localRecoverySql
    & docker compose exec -T database rm -f $containerBackupPath
}
