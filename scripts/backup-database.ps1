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

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $repositoryRoot = Split-Path -Parent $PSScriptRoot
    $OutputDirectory = Join-Path $repositoryRoot 'backups'
}

$null = New-Item -ItemType Directory -Force -Path $OutputDirectory
$outputDirectoryPath = (Resolve-Path $OutputDirectory).Path

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "$DatabaseName-$timestamp.bak"
$outputPath = Join-Path $outputDirectoryPath $fileName
$containerDirectory = '/var/opt/mssql/backup'
$containerPath = "$containerDirectory/$fileName"
$containerSqlFile = "/tmp/backup-$timestamp.sql"
$localSqlFile = Join-Path ([System.IO.Path]::GetTempPath()) "backup-$timestamp.sql"

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
    Set-Content -Path $localSqlFile -Value $backupQuery -Encoding utf8

    Write-Host "Đang sao lưu database $DatabaseName..."
    Invoke-SqlFileInContainer \
        -LocalSqlFile $localSqlFile \
        -ContainerSqlFile $containerSqlFile

    Invoke-DockerCommand -Arguments @(
        'compose', 'cp',
        "database:$containerPath",
        $outputPath
    )
}
finally {
    Remove-Item -Force -ErrorAction SilentlyContinue $localSqlFile
    & docker compose exec -T database rm -f $containerPath
}

$backupFile = Get-Item $outputPath
$sizeMb = [Math]::Round($backupFile.Length / 1MB, 2)

Write-Host 'Sao lưu và VERIFYONLY thành công.'
Write-Host "File: $($backupFile.FullName)"
Write-Host "Dung lượng: $sizeMb MB"
