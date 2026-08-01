[CmdletBinding()]
param(
    [string]$FrontendTunnelUrl = 'https://5ct6t80f-5173.asse.devtunnels.ms',
    [string]$BackendTunnelUrl = 'https://5ct6t80f-5240.asse.devtunnels.ms'
)

$ErrorActionPreference = 'Stop'

function Normalize-Url {
    param([Parameter(Mandatory)][string]$Url)

    $normalized = $Url.Trim().TrimEnd('/')
    if (-not [Uri]::IsWellFormedUriString($normalized, [UriKind]::Absolute)) {
        throw "URL không hợp lệ: $Url"
    }

    return $normalized
}

function Escape-SingleQuotedPowerShellString {
    param([Parameter(Mandatory)][string]$Value)

    return $Value.Replace("'", "''")
}

$FrontendTunnelUrl = Normalize-Url $FrontendTunnelUrl
$BackendTunnelUrl = Normalize-Url $BackendTunnelUrl

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendDirectory = Join-Path $repoRoot 'QuanLyNhaHang.Frontend'
$apiProject = Join-Path $repoRoot 'QuanLyNhaHang.Api\QuanLyNhaHang.Api.csproj'

if (-not (Test-Path -LiteralPath $frontendDirectory)) {
    throw "Không tìm thấy thư mục frontend: $frontendDirectory"
}

if (-not (Test-Path -LiteralPath $apiProject)) {
    throw "Không tìm thấy API project: $apiProject"
}

$occupiedPorts = @(5173, 5240) | Where-Object {
    Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue
}

if ($occupiedPorts.Count -gt 0) {
    $portList = ($occupiedPorts | Sort-Object -Unique) -join ', '
    throw "Các cổng $portList đang được sử dụng. Hãy dừng frontend/backend cũ rồi chạy lại script."
}

$shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    'pwsh'
} else {
    'powershell'
}

$escapedRepoRoot = Escape-SingleQuotedPowerShellString $repoRoot
$escapedFrontendDirectory = Escape-SingleQuotedPowerShellString $frontendDirectory
$escapedApiProject = Escape-SingleQuotedPowerShellString $apiProject
$escapedFrontendTunnelUrl = Escape-SingleQuotedPowerShellString $FrontendTunnelUrl
$escapedBackendTunnelUrl = Escape-SingleQuotedPowerShellString $BackendTunnelUrl

$apiCommand = @"
`$host.UI.RawUI.WindowTitle = 'QuanLyNhaHang API - Dev Tunnel'
`$env:ASPNETCORE_ENVIRONMENT = 'Development'
`$env:ASPNETCORE_URLS = 'http://0.0.0.0:5240'
`$env:Hosting__DisableHttpsRedirection = 'true'
`$env:Cors__AllowedOrigins__0 = 'http://localhost:5173'
`$env:Cors__AllowedOrigins__1 = 'https://localhost:5173'
`$env:Cors__AllowedOrigins__2 = '$escapedFrontendTunnelUrl'
Set-Location -LiteralPath '$escapedRepoRoot'
dotnet run --project '$escapedApiProject' --no-launch-profile
"@

$frontendCommand = @"
`$host.UI.RawUI.WindowTitle = 'QuanLyNhaHang Frontend - Dev Tunnel'
`$env:VITE_API_BASE_URL = '$escapedBackendTunnelUrl'
Set-Location -LiteralPath '$escapedFrontendDirectory'
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
"@

Write-Host 'Đang mở API HTTP với CORS cho frontend tunnel...' -ForegroundColor Cyan
Start-Process $shell -ArgumentList @('-NoExit', '-Command', $apiCommand)

Start-Sleep -Seconds 3

Write-Host 'Đang mở frontend với API tunnel...' -ForegroundColor Cyan
Start-Process $shell -ArgumentList @('-NoExit', '-Command', $frontendCommand)

Write-Host ''
Write-Host 'Đã khởi động cấu hình Dev Tunnel.' -ForegroundColor Green
Write-Host "Frontend: $FrontendTunnelUrl"
Write-Host "Backend health: $BackendTunnelUrl/health"
Write-Host ''
Write-Host 'Trong VS Code > PORTS, hãy đặt cả cổng 5173 và 5240 thành Public.' -ForegroundColor Yellow
Write-Host 'Không forward cổng HTTPS 7134 khi dùng script này.' -ForegroundColor Yellow
Write-Host 'Giữ hai cửa sổ Terminal vừa mở trong suốt thời gian dùng ứng dụng.' -ForegroundColor Yellow
