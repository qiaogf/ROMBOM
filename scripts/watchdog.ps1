# Autostart shim.
# HKCU Run key "ROMBOM-Watchdog" launches this file at logon.
# It hands off to scripts\start-prod.vbs (relay + static sync + site + ngrok + watchdog),
# then the node watchdog keeps neon-relay (6543), Next.js (3000) and ngrok alive
# with real HTTP / PostgreSQL / tunnel probes.
$ErrorActionPreference = "SilentlyContinue"
$projectDir = "D:\store\cross-border-store"

Start-Process -FilePath "wscript.exe" `
    -ArgumentList "`"$projectDir\scripts\start-prod.vbs`"" `
    -WorkingDirectory $projectDir `
    -WindowStyle Hidden
