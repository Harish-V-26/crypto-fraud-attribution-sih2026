@echo off
setlocal enabledelayedexpansion
title [SIH 2026] Crypto Fraud Attribution System Launcher
cls
echo ============================================================
echo   Crypto Fraud Attribution System — SIH 2026  v2.0
echo ============================================================
echo.

:: Detect local Wi-Fi / LAN IP address
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*' | Where-Object IPAddress -notmatch '^(169\.|192\.168\.56\.|127\.)' | Select-Object -ExpandProperty IPAddress -First 1)"`) do set LOCAL_IP=%%i
if "%LOCAL_IP%"=="" set LOCAL_IP=127.0.0.1

echo [1/3] Launching FastAPI Backend Live Terminal (Port 8000)...
start "[SIH 2026] FastAPI Backend Live Telemetry (Port 8000)" cmd /k "title [SIH 2026] Backend Live Telemetry ^& color 0A ^& cd /d %~dp0backend ^& set PYTHONUNBUFFERED=1 ^& set PYTHONIOENCODING=utf-8 ^& python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak > nul

echo [2/3] Launching React Frontend Dashboard (Port 5173)...
start "[SIH 2026] React Frontend Dashboard (Port 5173)" cmd /k "title [SIH 2026] React Frontend Dashboard ^& color 0B ^& cd /d %~dp0frontend-react ^& npm run dev -- --host 0.0.0.0"

timeout /t 2 /nobreak > nul

echo [3/3] Launching 3D Blockchain Simulation Static Server (Port 8080)...
start "[SIH 2026] 3D Simulation Static Server (Port 8080)" cmd /k "title [SIH 2026] 3D Simulation Server ^& color 0E ^& cd /d %~dp0frontend ^& python -m http.server 8080 --bind 0.0.0.0"

timeout /t 1 /nobreak > nul

echo.
echo ============================================================
echo   ALL 3 SERVERS RUNNING IN SEPARATE TERMINAL WINDOWS!
echo ============================================================
echo.
echo   [A] ON THIS LAPTOP (Localhost):
echo   ----------------------------------------------------------
echo   1. React Dashboard:        http://localhost:5173
echo   2. 3D Vector Simulation:   http://localhost:8000/3d_view.html
echo   3. Backend API Docs:       http://localhost:8000/docs
echo.
echo   [B] ON ANOTHER DEVICE (Same Wi-Fi / LAN):
echo   ----------------------------------------------------------
echo   Detected Your LAN IP: %LOCAL_IP%
echo.
echo   Tell your friend/colleague to open in their browser:
echo   1. React Dashboard:        http://%LOCAL_IP%:5173
echo   2. 3D Vector Simulation:   http://%LOCAL_IP%:8000/3d_view.html
echo   3. Backend API Docs:       http://%LOCAL_IP%:8000/docs
echo.
echo   [C] LIVE TERMINAL LOGS:
echo   ----------------------------------------------------------
echo   Keep the "[SIH 2026] Backend Live Telemetry" window visible!
echo   Every button click, trace, and web change is streamed there.
echo.
echo ============================================================
echo.
echo Press any key to close this launcher window (servers remain running).
pause > nul
