[CmdletBinding()]
param(
    [string]$ApiBaseUrl = 'http://localhost:8080',
    [string]$WebhookApiKey = $env:SEPAY_WEBHOOK_API_KEY,
    [ValidateRange(5, 60)]
    [int]$HeartbeatSeconds = 10,
    [string]$WorkerName = 'quanlynhahang-sepay-webhook'
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
$workerConfigPath = Join-Path $repoRoot 'infra/cloudflare/sepay-webhook-proxy/wrangler.jsonc'

if ([string]::IsNullOrWhiteSpace($WebhookApiKey)) {
    $WebhookApiKey = Get-DotEnvValue -Path (Join-Path $repoRoot '.env') -Name 'SEPAY_WEBHOOK_API_KEY'
}

if ([string]::IsNullOrWhiteSpace($WebhookApiKey)) {
    throw 'Thiếu SEPAY_WEBHOOK_API_KEY. Hãy đặt khóa trong .env hoặc truyền -WebhookApiKey.'
}

if (-not (Test-Path -LiteralPath $workerConfigPath)) {
    throw "Không tìm thấy Cloudflare Worker config: $workerConfigPath"
}

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflared) {
    throw 'Không tìm thấy cloudflared. Hãy cài cloudflared rồi mở PowerShell mới.'
}

$npx = Get-Command npx.cmd -ErrorAction SilentlyContinue
if (-not $npx) {
    $npx = Get-Command npx -ErrorAction SilentlyContinue
}
if (-not $npx) {
    throw 'Không tìm thấy npx. Hãy cài Node.js LTS rồi mở PowerShell mới.'
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

    Write-Host ''
    Write-Host "Quick Tunnel hiện tại: $tunnelUrl" -ForegroundColor DarkGray
    Write-Host "Đang cập nhật Worker $WorkerName để trỏ vào Quick Tunnel..." -ForegroundColor Cyan

    $deployArguments = @(
        '--yes',
        'wrangler@latest',
        'deploy',
        '--config',
        $workerConfigPath,
        '--var',
        "UPSTREAM_ORIGIN:$tunnelUrl"
    )
    $deployStdOut = Join-Path ([IO.Path]::GetTempPath()) (
        "quanlynhahang-wrangler-out-$([Guid]::NewGuid().ToString('N')).log")
    $deployStdErr = Join-Path ([IO.Path]::GetTempPath()) (
        "quanlynhahang-wrangler-err-$([Guid]::NewGuid().ToString('N')).log")

    try {
        $deployProcess = Start-Process -FilePath $npx.Source -ArgumentList $deployArguments -NoNewWindow -Wait -PassThru -RedirectStandardOutput $deployStdOut -RedirectStandardError $deployStdErr
        $deployExitCode = $deployProcess.ExitCode

        $deployStdOutText = if (Test-Path -LiteralPath $deployStdOut) {
            Get-Content -LiteralPath $deployStdOut -Raw -ErrorAction SilentlyContinue
        }
        else {
            ''
        }

        $deployStdErrText = if (Test-Path -LiteralPath $deployStdErr) {
            Get-Content -LiteralPath $deployStdErr -Raw -ErrorAction SilentlyContinue
        }
        else {
            ''
        }

        $deployText = @(
            $deployStdOutText
            $deployStdErrText
        ) -join [Environment]::NewLine
    }
    catch {
        throw "Không thể chạy Wrangler qua npx: $($_.Exception.Message)"
    }
    finally {
        if (Test-Path -LiteralPath $deployStdOut) {
            Remove-Item -LiteralPath $deployStdOut -Force -ErrorAction SilentlyContinue
        }

        if (Test-Path -LiteralPath $deployStdErr) {
            Remove-Item -LiteralPath $deployStdErr -Force -ErrorAction SilentlyContinue
        }
    }

    if ($deployExitCode -ne 0) {
        Write-Host $deployText -ForegroundColor Red
        throw @"
Không deploy được Cloudflare Worker.
Hãy chạy một lần:
  npx wrangler@latest login

Sau đó chạy lại script. Bạn cũng cần bật workers.dev cho tài khoản Cloudflare.
"@
    }

    $escapedWorkerName = [Regex]::Escape($WorkerName)
    $workerMatch = [Regex]::Match(
        $deployText,
        "https://$escapedWorkerName\.[a-z0-9-]+\.workers\.dev",
        [Text.RegularExpressions.RegexOptions]::IgnoreCase)

    if (-not $workerMatch.Success) {
        Write-Host $deployText -ForegroundColor Yellow
        throw @"
Worker đã được deploy nhưng không đọc được URL workers.dev từ output.
Hãy chạy:
  npx wrangler@latest deploy --config "$workerConfigPath" --var "UPSTREAM_ORIGIN:$tunnelUrl"

Sau đó lấy URL https://<worker>.<subdomain>.workers.dev và thử lại script.
"@
    }

    $workerBaseUrl = $workerMatch.Value.TrimEnd('/')
    $webhookUrl = "$workerBaseUrl$webhookPath"
    $readinessUrl = "$workerBaseUrl$readinessPath"
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
                'Worker chưa xác nhận được heartbeat. ' +
                'Thanh toán QR sẽ tự khóa cho tới khi kết nối hoạt động lại. ' +
                $_.Exception.Message)
            return $false
        }
    }

    Write-Host ''
    Write-Host 'Webhook SePay cố định:' -ForegroundColor Yellow
    Write-Host $webhookUrl -ForegroundColor Yellow
    Write-Host ''
    Write-Host 'Quick Tunnel chỉ là upstream nội bộ của Worker và có thể thay đổi mỗi lần chạy.' -ForegroundColor DarkGray
    Write-Host ''
    $confirmation = Read-Host (
        'Sau khi đã LƯU URL workers.dev trên SePay, nhập OK để kiểm tra và mở thanh toán'
    )
    if (-not [string]::Equals(
            $confirmation.Trim(),
            'OK',
            [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Chưa xác nhận đã cập nhật URL webhook trên SePay. Thanh toán tiếp tục bị khóa.'
    }

    if (-not (Send-ReadinessHeartbeat)) {
        throw 'Worker đã deploy nhưng heartbeat chưa tới được API local.'
    }

    Write-Host ''
    Write-Host 'Kênh webhook đã sẵn sàng; thanh toán QR đã được mở.' -ForegroundColor Green
    Write-Host (
        "Script sẽ gửi heartbeat mỗi $HeartbeatSeconds giây. " +
        'Nếu đóng cửa sổ này, ứng dụng sẽ tự ẩn và khóa QR sau tối đa khoảng 35 giây.'
    ) -ForegroundColor Cyan
    Write-Host 'URL SePay không còn phải đổi khi Quick Tunnel thay đổi.' -ForegroundColor Green
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
