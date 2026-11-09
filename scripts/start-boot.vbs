' ============================================================
' 开机自启包装器（由注册表 HKCU\...\Run 调用）
'   1) 等待 45 秒，让网卡 / Wi-Fi / 代理就绪
'   2) 调用 start-prod.vbs（幂等：neon-relay 6543 + next start 3000 + ngrok 固定域名）
'   3) 3 分钟后再调用一次，补起首次因网络未就绪而漏起的 ngrok 隧道
' 手动启动：双击 D:\store\cross-border-store\scripts\start-prod.vbs
' ============================================================
Option Explicit

Dim sh, launcher
Set sh = CreateObject("WScript.Shell")
launcher = "D:\store\cross-border-store\scripts\start-prod.vbs"

WScript.Sleep 45000
sh.Run "wscript.exe """ & launcher & """", 0, False

WScript.Sleep 180000
sh.Run "wscript.exe """ & launcher & """", 0, False
