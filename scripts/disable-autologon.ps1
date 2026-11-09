# ============================================================
# 撤销自动登录（恢复开机需输入密码）
# 用法：右键“使用 PowerShell 运行”，UAC 点“是”
# ============================================================

$ErrorActionPreference = 'Stop'

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`""
    )
    exit
}

$winlogon = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
New-ItemProperty -Path $winlogon -Name 'AutoAdminLogon' -Value '0' -PropertyType String -Force | Out-Null
Remove-ItemProperty -Path $winlogon -Name 'DefaultPassword' -ErrorAction SilentlyContinue

$system = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
Remove-ItemProperty -Path $system -Name 'DisableCAD' -ErrorAction SilentlyContinue

Write-Host "已关闭自动登录，默认密码已清除。下次开机需要手动输入密码。" -ForegroundColor Green
Read-Host "按回车关闭窗口"
