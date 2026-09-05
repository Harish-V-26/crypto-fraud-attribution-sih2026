@echo off
title [SIH 2026] React Frontend Dashboard (Port 5173)
color 0B
cls
echo ============================================================
echo   [SIH 2026] React Frontend Dashboard
echo   Starting Vite dev server on port 5173...
echo ============================================================
echo.
cd /d %~dp0frontend-react
npm run dev -- --host 0.0.0.0
pause
