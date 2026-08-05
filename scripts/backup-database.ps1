[CmdletBinding()]
param(
    [ValidatePattern('^[A-Za-z0-9_]+$')]
    [string]$DatabaseName = 'QuanLyNhaHang',

    [string]$OutputDirectory = ''
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

function Get-SqlCmdPath {
    & docker compose exec -T database test -x \
        /opt/mssql-tools18/bin/sqlcmd

    if ($LASTEXITCODE -eq 0) {
        return '/opt/mssql-tools18/bin/sqlcmd'
    }

    & docker compose exec -T database test -x \
        /opt/mssql-tools/bin/sqlcmd

    if ($LASTEXITCODE -eq 0) {
        return '/opt/mssql-tools/bin/sqlcmd'
    }

    throw 'Không tìm thấy sqlcmd trong container SQL Server.'
}

function Invoke-DatabaseSql {
    param(
        [Parameter(Mandatory)]
        [string]$Query
    )

    $password = (
        @(& docker compose exec -T database printenv MSSQL_SA_PASSWORD) \
            -join "`n"
    ).Trim()

    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($password)) {
        throw 'Không đọc được MSSQL_SA_PASSWORD từ container database.'
    }

    $sqlCmdPath = Get-SqlCmdPath
    $arguments = @(
        'compose', 'exec', '-T', 'database',
        $sqlCmdPath,
        '-S', 'localhost',
        '-U', 'sa',
        '-P', $password,
        '-b'
    )

    if ($sqlCmdPath -like '*mssql-tools18*') {
        $arguments += '-C'
    }

    $arguments += @('-Q', $Query)
    Invoke-DockerCommand -Arguments $arguments
}

Assert-DatabaseContainerRunning

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $repositoryRoot = Split-Path -Parent $PSScriptRoot
    $OutputDirectory = Join-Path $repositoryRoot 'backups'
}

$null = New-Item -ItemType Directory -Force \
    -Path $OutputDirectory
$outputDirectoryPath = (Resolve-Path $OutputDirectory).Path

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "$DatabaseName-$timestamp.bak"
$outputPath = Join-Path $outputDirectoryPath $fileName
$containerDirectory = '/var/opt/mssql/backup'
$containerPath = "$containerDirectory/$fileName"

Invoke-DockerCommand -Arguments @(
    'compose', 'exec', '-T', 'database',
    'mkdir', '-p', $containerDirectory
)

$backupQuery = @"
BACKUP DATABASE [$DatabaseName]
TO DISK = N'$containerPath'
WITH COPY_ONLY, INIT, CHECKSUM, COMPRESSION, STATS = 10;
RESTORE VERIFYONLY
FROM DISK = N'$containerPath'
WITH CHECKSUM;
"@

try {
    Write-Host "Đang sao lưu database $DatabaseName..."
    Invoke-DatabaseSql -Query $backupQuery

    Invoke-DockerCommand -Arguments @(
        'compose', 'cp',
        "database:$containerPath",
        $outputPath
    )
}
finally {
    & docker compose exec -T database rm -f $containerPath
}

$backupFile = Get-Item $outputPath
$sizeMb = [Math]::Round($backupFile.Length / 1MB, 2)

Write-Host "Sao lưu và VERIFYONLY thành công."
Write-Host "File: $($backupFile.FullName)"
Write-Host "Dung lượng: $sizeMb MB"
