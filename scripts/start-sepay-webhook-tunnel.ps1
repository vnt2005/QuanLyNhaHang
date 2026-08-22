[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'https://localhost:7134',
    [string]$WebhookApiKey = $env:SEPAY_WEBHOOK_API_KEY,
    [ValidateRange(5, 60)]
    [int]$HeartbeatSeconds = 10
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

function Get-DotEnvValue {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Name
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -notmatch ('^\s*' + [Regex]::Escape($Name) + '\s*=\s*(.*)$')) {
            continue
        }

        $value = $Matches[1].Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        return $value
    }

    return $null
}

$ApiBaseUrl = Normalize-Url $ApiBaseUrl
$healthUrl = "$ApiBaseUrl/health/live"
$webhookPath = '/api/customer-payments/sepay/webhook'
$readinessPath = '/api/customer-payments/sepay/readiness'
$repoRoot = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($WebhookApiKey)) {
    $WebhookApiKey = Get-DotEnvValue -Path (Join-Path $repoRoot '.env') -Name 'SEPAY_WEBHOOK_API_KEY'
}

if ([string]::IsNullOrWhiteSpace($WebhookApiKey)) {
    throw 'Thiếu SEPAY_WEBHOOK_API_KEY. Hãy đặt khóa trong .env hoặc truyền -WebhookApiKey.'
}

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

$logFile = Join-Path ([IO.Path]::GetTempPath()) (
    "quanlynhahang-cloudflared-$([Guid]::NewGuid().ToString('N')).log")
$tunnelArguments = @(
    'tunnel',
    '--url',
    $ApiBaseUrl,
    '--loglevel',
    'info',
    '--logfile',
    ('"' + $logFile + '"')
)
if ($ApiBaseUrl.StartsWith('https://', [StringComparison]::OrdinalIgnoreCase)) {
    $tunnelArguments += '--no-tls-verify'
}

$process = $null
try {
    Write-Host ''
    Write-Host 'API đã sẵn sàng. Đang tạo Cloudflare Quick Tunnel...' -ForegroundColor Green
    $process = Start-Process -FilePath $cloudflared.Source -ArgumentList $tunnelArguments -NoNewWindow -PassThru

    $deadline = [DateTime]::UtcNow.AddSeconds(35)
    $tunnelUrl = $null
    while (-not $process.HasExited -and
           [DateTime]::UtcNow -lt $deadline -and
           [string]::IsNullOrWhiteSpace($tunnelUrl)) {
        if (Test-Path -LiteralPath $logFile) {
            $logContent = Get-Content -LiteralPath $logFile -Raw -ErrorAction SilentlyContinue
            $match = [Regex]::Match(
                $logContent,
                'https://[a-z0-9-]+\.trycloudflare\.com',
                [Text.RegularExpressions.RegexOptions]::IgnoreCase)
            if ($match.Success) {
                $tunnelUrl = $match.Value.TrimEnd('/')
            }
        }

        if ([string]::IsNullOrWhiteSpace($tunnelUrl)) {
            Start-Sleep -Milliseconds 500
        }
    }

    if ($process.HasExited) {
        throw "cloudflared đã dừng với mã $($process.ExitCode)."
    }

    if ([string]::IsNullOrWhiteSpace($tunnelUrl)) {
        throw 'Không lấy được URL Quick Tunnel sau 35 giây.'
    }

    $webhookUrl = "$tunnelUrl$webhookPath"
    $readinessUrl = "$tunnelUrl$readinessPath"
    $headers = @{
        Authorization = "Apikey $WebhookApiKey"
    }

    function Send-ReadinessHeartbeat {
        try {
            $response = Invoke-RestMethod -Method Post -Uri $readinessUrl -Headers $headers -TimeoutSec 10
            return $response.webhookReady -eq $true
        }
        catch {
            Write-Warning (
                'Tunnel chưa xác nhận được heartbeat. ' +
                'Thanh toán QR sẽ tự khóa cho tới khi kết nối hoạt động lại. ' +
                $_.Exception.Message)
            return $false
        }
    }

    if (-not (Send-ReadinessHeartbeat)) {
        throw 'Tunnel đã tạo nhưng heartbeat công khai chưa tới được API.'
    }

    Write-Host ''
    Write-Host 'Kênh webhook đã sẵn sàng.' -ForegroundColor Green
    Write-Host 'Cấu hình webhook Có tiền vào trên SePay bằng URL:' -ForegroundColor Yellow
    Write-Host $webhookUrl -ForegroundColor Yellow
    Write-Host ''
    Write-Host (
        "Script sẽ gửi heartbeat mỗi $HeartbeatSeconds giây. " +
        'Nếu đóng cửa sổ này, ứng dụng sẽ tự ẩn và khóa QR sau tối đa khoảng 35 giây.'
    ) -ForegroundColor Cyan
    Write-Host 'Quick Tunnel đổi URL sau mỗi lần chạy; nhớ cập nhật lại URL trên SePay.' -ForegroundColor Yellow
    Write-Host ''

    while (-not $process.HasExited) {
        Start-Sleep -Seconds $HeartbeatSeconds
        if (-not $process.HasExited) {
            [void](Send-ReadinessHeartbeat)
        }
    }

    if ($process.ExitCode -ne 0) {
        throw "cloudflared đã dừng với mã $($process.ExitCode)."
    }
}
finally {
    if ($process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
    }

    if (Test-Path -LiteralPath $logFile) {
        Remove-Item -LiteralPath $logFile -Force -ErrorAction SilentlyContinue
    }
}
