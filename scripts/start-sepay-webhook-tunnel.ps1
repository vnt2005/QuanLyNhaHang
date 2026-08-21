[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'https://localhost:7134'
)

$ErrorActionPreference = 'Stop'

function Normalize-Url {
    param([Parameter(Mandatory)][string]$Url)

    $normalized = $Url.Trim().TrimEnd('/')
    if (-not [Uri]::IsWellFormedUriString($normalized, [UriKind]::Absolute)) {
        throw "URL API không hợp lệ: $Url"
    }

    $uri = [Uri]$normalized
    if ($uri.Scheme -notin @('http', 'https')) {
        throw 'URL API phải dùng giao thức http hoặc https.'
    }

    return $normalized
}

$ApiBaseUrl = Normalize-Url $ApiBaseUrl
$healthUrl = "$ApiBaseUrl/health/live"
$webhookPath = '/api/customer-payments/sepay/webhook'

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    throw 'Không tìm thấy cloudflared. Hãy cài cloudflared rồi mở PowerShell mới.'
}

$curl = Get-Command curl.exe -ErrorAction SilentlyContinue
if (-not $curl) {
    throw 'Không tìm thấy curl.exe để kiểm tra API local.'
}

$curlArguments = @(
    '--silent',
    '--show-error',
    '--fail',
    '--max-time',
    '10'
)
if ($ApiBaseUrl.StartsWith('https://', [StringComparison]::OrdinalIgnoreCase)) {
    $curlArguments += '--insecure'
}
$curlArguments += $healthUrl

Write-Host "Đang kiểm tra API: $healthUrl" -ForegroundColor Cyan
& $curl.Source @curlArguments | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "API chưa sẵn sàng tại $ApiBaseUrl. Hãy chạy API đúng cổng rồi thử lại."
}

$tunnelArguments = @('tunnel', '--url', $ApiBaseUrl)
if ($ApiBaseUrl.StartsWith('https://', [StringComparison]::OrdinalIgnoreCase)) {
    $tunnelArguments += '--no-tls-verify'
}

Write-Host ''
Write-Host 'API đã sẵn sàng. Đang tạo Cloudflare Quick Tunnel...' -ForegroundColor Green
Write-Host 'Khi cloudflared in ra URL https://....trycloudflare.com, cấu hình SePay bằng:' -ForegroundColor Yellow
Write-Host "https://....trycloudflare.com$webhookPath" -ForegroundColor Yellow
Write-Host 'Giữ nguyên cửa sổ PowerShell này trong lúc nhận thanh toán.' -ForegroundColor Yellow
Write-Host 'Nếu khởi động lại Quick Tunnel, hãy cập nhật URL mới trong SePay.' -ForegroundColor Yellow
Write-Host ''

& $cloudflared.Source @tunnelArguments
