# ============================================================
# 开启 Windows 自动登录（通电 -> 自动进桌面 -> 自动拉起独立站服务）
# 用法：右键“使用 PowerShell 运行”，UAC 点“是”，然后在窗口里输入 Administrator 的密码
#
# 说明：
#   - 自动登录依赖 Winlogon 的 AutoAdminLogon，密码会以明文形式保存在
#     HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon\DefaultPassword
#     （仅本机管理员可读取；如需撤销，运行 scripts\disable-autologon.ps1）
#   - 登录完成后，注册表 Run 项会调用 scripts\start-boot.vbs -> start-prod.vbs
# ============================================================

$ErrorActionPreference = 'Stop'

# ---- 1) 提权：非管理员则自我重启并请求 UAC ----
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$PSCommandPath`""
    )
    Write-Host "已请求管理员权限，请在 UAC 窗口点击“是”..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    exit
}

$winlogon = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon'
$userName = $env:USERNAME
$domain   = $env:COMPUTERNAME

Write-Host "当前账户：$userName    本机：$domain" -ForegroundColor Cyan
Write-Host "请输入该账户的登录密码（输入时不显示）：" -ForegroundColor Cyan
$secure = Read-Host -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrEmpty($plain)) {
    Write-Host "密码为空，已取消（如果账户确实没有密码，请先设置密码再运行本脚本）。" -ForegroundColor Red
    Read-Host "按回车退出"
    exit 1
}

# ---- 2) 写入自动登录配置 ----
New-ItemProperty -Path $winlogon -Name 'AutoAdminLogon'  -Value '1'        -PropertyType String -Force | Out-Null
New-ItemProperty -Path $winlogon -Name 'DefaultUserName' -Value $userName  -PropertyType String -Force | Out-Null
New-ItemProperty -Path $winlogon -Name 'DefaultDomainName' -Value $domain  -PropertyType String -Force | Out-Null
New-ItemProperty -Path $winlogon -Name 'DefaultPassword' -Value $plain     -PropertyType String -Force | Out-Null

# 关闭“必须按 Ctrl+Alt+Del 才能登录”，保证无人值守时也能自动进桌面
$system = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System'
New-Item -Path $system -Force | Out-Null
New-ItemProperty -Path $system -Name 'DisableCAD' -Value 1 -PropertyType DWord -Force | Out-Null

$plain = $null

# ---- 3) 校验 ----
$check = Get-ItemProperty -Path $winlogon
Write-Host ""
Write-Host "配置完成：" -ForegroundColor Green
Write-Host "  AutoAdminLogon  = $($check.AutoAdminLogon)"
Write-Host "  DefaultUserName = $($check.DefaultUserName)"
Write-Host "  DefaultDomainName = $($check.DefaultDomainName)"
Write-Host "  DefaultPassword = (已写入)"
Write-Host ""
Write-Host "下次开机将自动登录并拉起服务（http://localhost:3000）。" -ForegroundColor Green
Write-Host "如需撤销：运行 scripts\disable-autologon.ps1" -ForegroundColor DarkGray
Read-Host "按回车关闭窗口"
