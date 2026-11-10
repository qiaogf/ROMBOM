# scripts/watchdog.ps1
# 每 10 秒检查 neon-relay (6543) 和 Next.js (3000) 是否存活，死了就重拉
# 启动: powershell -WindowStyle Hidden -File scripts\watchdog.ps1
# 或加进 start-prod.vbs 作为第四步

$ErrorActionPreference = "Continue"
$projectDir = "D:\store\cross-border-store"
$relayLog   = Join-Path $projectDir "scripts\relay.log"
$watchLog   = Join-Path $projectDir "scripts\watchdog.log"

function Write-WatchLog {
    param([string]$msg)
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
    Add-Content -Path $watchLog -Value $line
    Write-Host $line
}

function Test-Port {
    param([int]$port)
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

function Start-Relay {
    Write-WatchLog "neon-relay (6543) DOWN — restarting..."
    Start-Process -FilePath "node" `
        -ArgumentList "--max-old-space-size=64","scripts\neon-relay.cjs" `
        -WorkingDirectory $projectDir `
        -WindowStyle Hidden
}

function Start-Prod {
    Write-WatchLog "Next.js (3000) DOWN — restarting..."
    Start-Process -FilePath "node" `
        -ArgumentList "--max-old-space-size=512",".next\standalone\server.js" `
        -WorkingDirectory $projectDir `
        -WindowStyle Hidden
}

Write-WatchLog "Watchdog started. Checking every 10s."

while ($true) {
    try {
        # neon-relay check
        if (-not (Test-Port 6543)) { Start-Relay }

        # Next.js check
        if (-not (Test-Port 3000)) { Start-Prod }
    } catch {
        Write-WatchLog "Check error: $_"
    }

    Start-Sleep -Seconds 10
}
