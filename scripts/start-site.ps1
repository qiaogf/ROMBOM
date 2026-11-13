# ============================================================
# Cross-border store production launcher (windowless, idempotent)
# 双击运行，或：powershell -ExecutionPolicy Bypass -File D:\store\cross-border-store\scripts\start-site.ps1
#
# 1) DATABASE_URL 指向 127.0.0.1:6543 时确保 neon-relay 在跑
# 2) 同步 .next\static 与 public 进 .next\standalone（next build 不会自动复制）
# 3) 在 3000 起 .next\standalone\server.js（HOSTNAME=0.0.0.0）
# 4) 起 ngrok 固定域名隧道
# 5) 起 watchdog（HTTP 探活 + 自动重拉）
#
# 固定公网地址: https://dehydrate-esquire-hybrid.ngrok-free.dev
# 局域网      : http://192.168.3.155:3000
# ============================================================

$project = 'D:\store\cross-border-store'
$ngrokExe = 'D:\ngrok\ngrok.exe'
$ngrokCfg = 'C:\Users\Administrator\AppData\Local\ngrok\ngrok.yml'
$domain = 'dehydrate-esquire-hybrid.ngrok-free.dev'

Set-Location $project

function Test-PortListening([int]$port) {
    return [bool](Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)
}

function Get-NodeCmdLines {
    return (Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
        ForEach-Object { $_.CommandLine })
}

# 读取 DATABASE_URL，判断是否需要本地中继
$dbUrl = ''
foreach ($f in @("$project\.env.local", "$project\.env")) {
    if (Test-Path $f) {
        $line = Select-String -Path $f -Pattern '^\s*DATABASE_URL\s*=\s*(.+?)\s*$' | Select-Object -First 1
        if ($line) { $dbUrl = $line.Matches[0].Groups[1].Value.Trim('"').Trim("'"); break }
    }
}
$useRelay = $dbUrl -match '(127\.0\.0\.1|localhost):6543'

# 1) neon relay
if ($useRelay) {
    if (-not (Get-NodeCmdLines | Where-Object { $_ -like '*neon-relay*' })) {
        Start-Process -FilePath 'node.exe' -ArgumentList 'scripts\neon-relay.cjs' -WorkingDirectory $project -WindowStyle Hidden -RedirectStandardOutput "$project\scripts\relay.log" -RedirectStandardError "$project\scripts\relay-err.log"
        Start-Sleep -Seconds 3
    }
}

# 2) sync static / public into standalone
if (Test-Path "$project\.next\static") {
    robocopy "$project\.next\static" "$project\.next\standalone\.next\static" /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if (Test-Path "$project\public") {
        robocopy "$project\public" "$project\.next\standalone\public" /E /NFL /NDL /NJH /NJS /NP | Out-Null
    }
}

# 3) standalone server on 3000
if (-not (Test-PortListening 3000)) {
    $env:HOSTNAME = '0.0.0.0'
    Start-Process -FilePath 'node.exe' -ArgumentList '.next\standalone\server.js' -WorkingDirectory $project -WindowStyle Hidden -RedirectStandardOutput "$project\next-start.log" -RedirectStandardError "$project\next-start-err.log"
    Start-Sleep -Seconds 10
}

# 4) ngrok fixed domain tunnel
if (-not (Get-Process ngrok -ErrorAction SilentlyContinue)) {
    if (Test-Path $ngrokExe) {
        Start-Process -FilePath $ngrokExe -ArgumentList 'http', '3000', "--url=$domain", "--config=$ngrokCfg" -WindowStyle Hidden
    } else {
        Write-Host "ngrok.exe not found: $ngrokExe (tunnel skipped, local site still works)"
    }
}

# 5) watchdog
if (-not (Get-NodeCmdLines | Where-Object { $_ -like '*watchdog.cjs*' })) {
    Start-Process -FilePath 'node.exe' -ArgumentList 'scripts\watchdog.cjs' -WorkingDirectory $project -WindowStyle Hidden -RedirectStandardOutput "$project\scripts\watchdog-console.log" -RedirectStandardError "$project\scripts\watchdog-console-err.log"
}
