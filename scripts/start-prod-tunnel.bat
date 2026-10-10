@echo off
REM ============================================================
REM 跨境电商生产环境启动器：3000 服务 + ngrok 固定域名隧道
REM 用途：开机/登录后自动拉起 Next.js 生产服务与公网隧道
REM 固定域名：https://dehydrate-esquire-hybrid.ngrok-free.dev
REM ============================================================

cd /d D:\store\cross-border-store

REM 若 3000 已监听则跳过启动服务
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [INFO] Port 3000 already listening, skip next start
) else (
  echo [INFO] Starting Next.js production server on port 3000...
  start "next-3000" /MIN node node_modules/next/dist/bin/next start
  timeout /t 10 /nobreak >nul
)

REM 启动 ngrok 固定域名隧道（前台占住窗口；关闭窗口=关闭隧道）
echo [INFO] Starting ngrok tunnel -> https://dehydrate-esquire-hybrid.ngrok-free.dev
"C:\Users\Administrator\AppData\Local\ngrok\ngrok.exe" http 3000 --domain=dehydrate-esquire-hybrid.ngrok-free.dev
