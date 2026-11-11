﻿﻿﻿' ============================================================
' Cross-border store production launcher (windowless, idempotent)
' Invoked from shell:startup via explorer, or manually:
'   explorer.exe D:\store\cross-border-store\scripts\start-prod.vbs
'
' Steps:
'   0) kill impostor "serve public" (may hijack port 3000)
'   1) start neon-relay on 127.0.0.1:6543 if missing
'   2) start "next start -p 3000" if missing
'   3) start ngrok tunnel to 3000 with the fixed dev domain
'
' Fixed public URL: https://dehydrate-esquire-hybrid.ngrok-free.dev
' LAN             : http://192.168.3.155:3000
' ============================================================
Option Explicit

Dim sh, fso, projectDir, ngrokExe, ngrokCfg, domain
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = "D:\store\cross-border-store"
ngrokExe   = "D:\ngrok\ngrok.exe"
ngrokCfg   = "C:\Users\Administrator\AppData\Local\ngrok\ngrok.yml"
domain     = "dehydrate-esquire-hybrid.ngrok-free.dev"

sh.CurrentDirectory = projectDir

Dim wmi, procs, p, found

Set wmi = GetObject("winmgmts:\\.\root\cimv2")

' ---- 0) kill impostor "serve public" ----
On Error Resume Next
Set procs = wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE CommandLine LIKE '%serve%' AND CommandLine LIKE '%public%'")
For Each p In procs
    p.Terminate()
Next
On Error GoTo 0

WScript.Sleep 2000

' ---- 1) neon relay on 6543 ----
found = False
On Error Resume Next
Set procs = wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name = 'node.exe' AND CommandLine LIKE '%neon-relay%'")
For Each p In procs
    found = True
Next
On Error GoTo 0

If Not found Then
    sh.Run "cmd /c node scripts\neon-relay.cjs > scripts\relay.log 2>&1", 0, False
    WScript.Sleep 3000
End If

' ---- 2) next start on 3000 ----
found = False
On Error Resume Next
Set procs = wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name = 'node.exe' AND (CommandLine LIKE '%next start%' OR CommandLine LIKE '%next-server%')")
For Each p In procs
    found = True
Next
On Error GoTo 0

If Not found Then
    sh.Run "cmd /c node .next\standalone\server.js -p 3000 > next-start.log 2>&1", 0, False
    WScript.Sleep 10000
End If

' ---- 3) ngrok fixed domain tunnel to 3000 ----
found = False
On Error Resume Next
Set procs = wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name = 'ngrok.exe'")
For Each p In procs
    found = True
Next
On Error GoTo 0

If Not found Then
    If fso.FileExists(ngrokExe) Then
        sh.Run """" & ngrokExe & """ http 3000 --url=" & domain & " --config=""" & ngrokCfg & """", 0, False
    Else
        MsgBox "ngrok.exe not found: " & ngrokExe & vbCrLf & "Tunnel skipped. Local site (localhost:3000) still works." & vbCrLf & "Restore ngrok.exe to this path, then rerun start-prod.vbs.", 48, "start-prod"
    End If
End If
