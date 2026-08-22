[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'http://localhost:8080',
    [string]$ExistingTunnelUrl,
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

function Normalize-QuickTunnelUrl {
    param([Parameter(Mandatory)][string]$Url)

    $normalized = Normalize-Url $Url
    $uri = [Uri]$normalized
    if ($uri.Scheme -ne 'https' -or
        -not $uri.Host.EndsWith('.trycloudflare.com', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'ExistingTunnelUrl phải là URL HTTPS của Cloudflare Quick Tunnel (*.trycloudflare.com).'
    }

    if ($uri.AbsolutePath -ne '/') {
        throw 'ExistingTunnelUrl chỉ được chứa URL gốc của tunnel, không kèm đường dẫn webhook.'
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

$process = $null
$ownsTunnel = $false
$logFile = $null
$tunnelUrl = $null

try {
    if (-not [string]::IsNullOrWhiteSpace($ExistingTunnelUrl)) {
        $tunnelUrl = Normalize-QuickTunnelUrl $ExistingTunnelUrl
        Write-Host ''
        Write-Host 'Đang dùng Cloudflare Quick Tunnel đã chạy sẵn:' -ForegroundColor Green
        Write-Host $tunnelUrl -ForegroundColor Green
    }
    else {
        $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
        if (-not $cloudflared) {
            throw 'Không tìm thấy cloudflared. Hãy cài cloudflared rồi mở PowerShell mới.'
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

        Write-Host ''
        Write-Host 'API đã sẵn sàng. Đang tạo Cloudflare Quick Tunnel...' -ForegroundColor Green
        $process = Start-Process -FilePath $cloudflared.Source -ArgumentList $tunnelArguments -NoNewWindow -PassThru
        $ownsTunnel = $true

        $deadline = [DateTime]::UtcNow.AddSeconds(35)
        while (-not $process.HasExited -and
               [DateTime]::UtcNow -lt $deadline -and
               [string]::IsNullOrWhiteSpace($tunnelUrl)) {
            if (Test-Path -LiteralPath $logFile) {
                $logContent = Get-Content -LiteralPath $logFile -Raw -ErrorAction SilentlyContinue
                if (-not [string]::IsNullOrWhiteSpace($logContent)) {
                    $match = [Regex]::Match(
                        $logContent,
                        'https://[a-z0-9-]+\.trycloudflare\.com',
                        [Text.RegularExpressions.RegexOptions]::IgnoreCase)
                    if ($match.Success) {
                        $tunnelUrl = $match.Value.TrimEnd('/')
                    }
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

    Write-Host ''
    Write-Host 'Thanh toán QR vẫn đang bị khóa cho tới khi heartbeat được xác nhận.' -ForegroundColor Yellow
    Write-Host 'Webhook Có tiền vào trên SePay phải dùng đúng URL:' -ForegroundColor Yellow
    Write-Host $webhookUrl -ForegroundColor Yellow
    Write-Host ''
    $confirmation = Read-Host (
        'Sau khi đã LƯU URL trên SePay, nhập OK để kiểm tra và mở thanh toán'
    )
    if (-not [string]::Equals(
            $confirmation.Trim(),
            'OK',
            [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Chưa xác nhận đã cập nhật URL webhook trên SePay. Thanh toán tiếp tục bị khóa.'
    }

    if (-not (Send-ReadinessHeartbeat)) {
        throw 'Tunnel đang chạy nhưng heartbeat công khai chưa tới được API.'
    }

    Write-Host ''
    Write-Host 'Kênh webhook đã sẵn sàng; thanh toán QR đã được mở.' -ForegroundColor Green
    Write-Host (
        "Script sẽ gửi heartbeat mỗi $HeartbeatSeconds giây. " +
        'Nếu dừng tunnel hoặc đóng cửa sổ heartbeat, ứng dụng sẽ tự khóa QR sau tối đa khoảng 35 giây.'
    ) -ForegroundColor Cyan
    if ($ownsTunnel) {
        Write-Host 'Quick Tunnel đổi URL sau mỗi lần chạy; nhớ cập nhật lại URL trên SePay.' -ForegroundColor Yellow
    }
    else {
        Write-Host 'Đang gắn heartbeat vào tunnel có sẵn; giữ cả hai cửa sổ PowerShell mở.' -ForegroundColor Yellow
    }
    Write-Host ''

    while ($true) {
        Start-Sleep -Seconds $HeartbeatSeconds

        if ($ownsTunnel -and $process.HasExited) {
            break
        }

        [void](Send-ReadinessHeartbeat)
    }

    if ($ownsTunnel -and $process.ExitCode -ne 0) {
        throw "cloudflared đã dừng với mã $($process.ExitCode)."
    }
}
finally {
    if ($ownsTunnel -and $process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -ErrorAction SilentlyContinue
    }

    if ($logFile -and (Test-Path -LiteralPath $logFile)) {
        Remove-Item -LiteralPath $logFile -Force -ErrorAction SilentlyContinue
    }
}
