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

    $runnerFileName =
        "run-sqlcmd-$([Guid]::NewGuid().ToString('N')).sh"
    $localRunnerFile = Join-Path (
        [System.IO.Path]::GetTempPath()
    ) $runnerFileName
    $containerRunnerFile = "/tmp/$runnerFileName"

    $runnerScript = @'
set -eu
if [ -x /opt/mssql-tools18/bin/sqlcmd ]; then
    SQLCMD=/opt/mssql-tools18/bin/sqlcmd
    set -- -C
else
    SQLCMD=/opt/mssql-tools/bin/sqlcmd
    set --
fi

"$SQLCMD" -S localhost -U sa -P "$MSSQL_SA_PASSWORD" "$@" -b -r 1 -i "$SQL_FILE"
'@

    $runnerScript = $runnerScript -replace "`r`n", "`n"
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText(
        $localRunnerFile,
        $runnerScript,
        $utf8WithoutBom
    )

    try {
        Invoke-DockerCommand -Arguments @(
            'compose', 'cp',
            $LocalSqlFile,
            "database:$ContainerSqlFile"
        )

        Invoke-DockerCommand -Arguments @(
            'compose', 'cp',
            $localRunnerFile,
            "database:$containerRunnerFile"
        )

        Invoke-DockerCommand -Arguments @(
            'compose', 'exec', '-T',
            '--env', "SQL_FILE=$ContainerSqlFile",
            'database',
            '/bin/bash', $containerRunnerFile
        )
    }
    finally {
        & docker compose exec -T --user root database rm -f `
            $ContainerSqlFile $containerRunnerFile
        Remove-Item -Force -ErrorAction SilentlyContinue $localRunnerFile
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
$utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)

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

IF DB_ID(N'$DatabaseName') IS NOT NULL
BEGIN
    ALTER DATABASE [$DatabaseName]
    SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
END;

RESTORE DATABASE [$DatabaseName]
FROM DISK = N'$containerBackupPath'
WITH REPLACE, RECOVERY, CHECKSUM, STATS = 10;

ALTER DATABASE [$DatabaseName] SET MULTI_USER;
"@

$recoveryQuery = @"
USE [master];
IF DB_ID(N'$DatabaseName') IS NOT NULL
    ALTER DATABASE [$DatabaseName]
    SET MULTI_USER WITH ROLLBACK IMMEDIATE;
"@

try {
    [System.IO.File]::WriteAllText(
        $localVerifySql,
        ($verifyQuery -replace "`r`n", "`n"),
        $utf8WithoutBom
    )
    [System.IO.File]::WriteAllText(
        $localRestoreSql,
        ($restoreQuery -replace "`r`n", "`n"),
        $utf8WithoutBom
    )
    [System.IO.File]::WriteAllText(
        $localRecoverySql,
        ($recoveryQuery -replace "`r`n", "`n"),
        $utf8WithoutBom
    )

    Write-Host 'Đang kiểm tra tính toàn vẹn của file backup...'
    Invoke-SqlFileInContainer `
        -LocalSqlFile $localVerifySql `
        -ContainerSqlFile $containerVerifySql

    Write-Host "Đang khôi phục database $DatabaseName..."
    $restoreAttempted = $true
    Invoke-SqlFileInContainer `
        -LocalSqlFile $localRestoreSql `
        -ContainerSqlFile $containerRestoreSql

    Write-Host 'Khôi phục database thành công.'
}
finally {
    if ($restoreAttempted) {
        try {
            Invoke-SqlFileInContainer `
                -LocalSqlFile $localRecoverySql `
                -ContainerSqlFile $containerRecoverySql
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
    & docker compose exec -T --user root database rm -f `
        $containerBackupPath
}
