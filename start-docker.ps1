param(
  [ValidateSet('Default', 'Chrome', 'Edge')]
  [string]$Browser = 'Default'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Get-ComposePort {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Default
  )

  $environmentValue = [Environment]::GetEnvironmentVariable($Name)
  if ($environmentValue -and $environmentValue -match '^\d+$') {
    return [int]$environmentValue
  }

  $envFile = Join-Path $PSScriptRoot '.env'
  if (Test-Path $envFile) {
    $match = Get-Content $envFile |
      Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=\s*(\d+)\s*$" } |
      Select-Object -First 1

    if ($match -and $match -match '=\s*(\d+)\s*$') {
      return [int]$Matches[1]
    }
  }

  return $Default
}

function Wait-HttpEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  Write-Host "Dang cho $Name san sang: $Url" -ForegroundColor Cyan

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Write-Host "$Name da san sang." -ForegroundColor Green
        return $true
      }
    } catch {
      Start-Sleep -Seconds 2
      continue
    }

    Start-Sleep -Seconds 2
  }

  Write-Warning "$Name chua san sang sau $TimeoutSeconds giay: $Url"
  return $false
}

function Open-Site {
  param([Parameter(Mandatory = $true)][string]$Url)

  switch ($Browser) {
    'Chrome' {
      $chrome = Get-Command chrome.exe -ErrorAction SilentlyContinue
      if ($chrome) {
        Start-Process $chrome.Source $Url
        return
      }
      Write-Warning 'Khong tim thay chrome.exe, se mo bang trinh duyet mac dinh.'
    }
    'Edge' {
      $edge = Get-Command msedge.exe -ErrorAction SilentlyContinue
      if ($edge) {
        Start-Process $edge.Source $Url
        return
      }
      Write-Warning 'Khong tim thay msedge.exe, se mo bang trinh duyet mac dinh.'
    }
  }

  Start-Process $Url
}

function Ensure-DockerReady {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Khong tim thay lenh docker. Hay cai Docker Desktop truoc.'
  }

  docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    return
  }

  $dockerDesktop = Join-Path $Env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
  if (-not (Test-Path $dockerDesktop)) {
    throw 'Docker Engine chua chay va khong tim thay Docker Desktop de tu khoi dong.'
  }

  Write-Host 'Docker Desktop chua chay. Dang tu khoi dong Docker Desktop...' -ForegroundColor Yellow
  Start-Process $dockerDesktop

  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 3
    docker info *> $null
    if ($LASTEXITCODE -eq 0) {
      Write-Host 'Docker Desktop da san sang.' -ForegroundColor Green
      return
    }
  }

  throw 'Docker Desktop chua san sang sau 120 giay.'
}

try {
  Ensure-DockerReady

  Write-Host 'Dang build va khoi dong toan bo QuanLyNhaHang...' -ForegroundColor Cyan
  docker compose up -d --build
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose up that bai voi exit code $LASTEXITCODE."
  }

  $apiPort = Get-ComposePort -Name 'API_PORT' -Default 8080
  $adminPort = Get-ComposePort -Name 'FRONTEND_PORT' -Default 5173
  $customerPort = Get-ComposePort -Name 'CUSTOMER_FRONTEND_PORT' -Default 5174

  $apiUrl = "http://localhost:$apiPort/health"
  $adminUrl = "http://localhost:$adminPort"
  $customerUrl = "http://localhost:$customerPort"

  $apiReady = Wait-HttpEndpoint -Name 'API' -Url $apiUrl
  $adminReady = Wait-HttpEndpoint -Name 'Web App Admin' -Url $adminUrl
  $customerReady = Wait-HttpEndpoint -Name 'CustomerWeb' -Url $customerUrl

  Write-Host ''
  docker compose ps
  Write-Host ''

  if ($adminReady) {
    Open-Site $adminUrl
  }
  if ($customerReady) {
    Open-Site $customerUrl
  }

  if (-not ($apiReady -and $adminReady -and $customerReady)) {
    Write-Warning 'Co service chua san sang. Chay "docker compose ps" va "docker compose logs" de kiem tra.'
    exit 1
  }

  Write-Host 'Da khoi dong xong va mo ca Web App Admin + CustomerWeb.' -ForegroundColor Green
} catch {
  Write-Host ''
  Write-Host "LOI: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'Ban co the kiem tra bang: docker compose ps' -ForegroundColor Yellow
  exit 1
}
