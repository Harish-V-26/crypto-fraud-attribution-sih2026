@echo off
setlocal enabledelayedexpansion
title Crypto Fraud Attribution System Launcher
cls
echo ============================================================
echo   Crypto Fraud Attribution System — SIH 2026  v2.0
echo ============================================================
echo.

:: Detect local Wi-Fi / LAN IP address
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -match 'Wi-Fi|Ethernet' -and $_.IPAddress -notmatch '^169\.|^192\.168\.56\.' } | Select-Object -First 1).IPAddress"`) do set LOCAL_IP=%%i
if "%LOCAL_IP%"=="" set LOCAL_IP=YOUR_IP_ADDRESS

echo [1/3] Starting FastAPI Backend (Port 8000)...
start "FastAPI Backend" cmd /k "cd /d %~dp0backend && pip install -q -r requirements.txt && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak > nul

echo [2/3] Starting React Frontend Dashboard (Port 5173)...
start "React Frontend" cmd /k "cd /d %~dp0frontend-react && npm run dev -- --host 0.0.0.0"

timeout /t 2 /nobreak > nul

echo [3/3] Starting 3D Blockchain Simulation (Port 8080)...
start "3D View & Static Server" cmd /k "cd /d %~dp0frontend && python -m http.server 8080 --bind 0.0.0.0"

timeout /t 1 /nobreak > nul

echo.
echo ============================================================
echo   ALL 3 SITES RUNNING!
echo ============================================================
echo.
echo   [A] ON THIS LAPTOP (Localhost):
echo   ----------------------------------------------------------
echo   1. React Dashboard:        http://localhost:5173
echo   2. 3D Vector Simulation:   http://localhost:8000/3d_view.html
echo   3. Backend API Docs:       http://localhost:8000/docs
echo.
echo   [B] ON YOUR FRIEND'S LAPTOP (Same Wi-Fi / LAN):
echo   ----------------------------------------------------------
echo   Detected Your LAN IP: %LOCAL_IP%
echo.
echo   Tell your friend to open in their browser:
echo   1. React Dashboard:        http://%LOCAL_IP%:5173
echo   2. 3D Vector Simulation:   http://%LOCAL_IP%:8000/3d_view.html
echo   3. Backend API Docs:       http://%LOCAL_IP%:8000/docs
echo.
echo   (Note: Both 3D view and API run seamlessly together on port 8000)

echo ============================================================
echo.
echo All 3 server terminal windows are running in the background.
echo Press any key to close this launcher window (servers remain running).
pause > nul
